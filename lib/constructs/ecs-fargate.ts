import { Construct } from "constructs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { RemovalPolicy } from "aws-cdk-lib";
import * as path from "path";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Network } from "./network";

export interface EcsFargateProps {
  network: Network;
}

export class EcsFargate extends Construct {
  public readonly lb: elbv2.IApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: EcsFargateProps) {
    super(scope, id);

    /**
     * ECS definitions construct
     */
    const taskDefinition = new ecs.FargateTaskDefinition(this, "EcsTask", {
      memoryLimitMiB: 512,
      cpu: 256,
    });
    const logGroup = new logs.LogGroup(this, "LogGroup", {
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // NOTE: in this example just use a simple flask container, which is
    // not a common way for production.
    // see https://flask.palletsprojects.com/en/1.0.x/deploying/uwsgi/
    taskDefinition
      .addContainer("FlaskContainer", {
        image: ecs.ContainerImage.fromAsset(
          path.join(__dirname, "../../backend")
        ),
        logging: ecs.LogDriver.awsLogs({
          streamPrefix: "flask-backend",
          logGroup: logGroup,
        }),
      })
      .addPortMappings({
        containerPort: 5000,
        hostPort: 5000,
        protocol: ecs.Protocol.TCP,
      });

    const cluster = new ecs.Cluster(this, "EcsCluster", {
      vpc: props.network.vpc,
    });
    const service = new ecs.FargateService(this, "EcsService", {
      cluster,
      taskDefinition,
      vpcSubnets: props.network.appSubnets,
      desiredCount: 1,
      maxHealthyPercent: 200,
      minHealthyPercent: 50,
    });

    const lb = new elbv2.ApplicationLoadBalancer(this, "Alb", {
      vpc: props.network.vpc,
      vpcSubnets: props.network.lbSubnets,
      internetFacing: false,
    });
    const listener = lb.addListener("Listener", { port: 80 });

    service.registerLoadBalancerTargets({
      containerName: taskDefinition.defaultContainer!.containerName,
      containerPort: taskDefinition.defaultContainer!.containerPort,
      newTargetGroupId: "ECS",
      listener: ecs.ListenerConfig.applicationListener(listener, {
        // NOTE: in this example use HTTP, not HTTPS for simplicity
        protocol: elbv2.ApplicationProtocol.HTTP,
      }),
    });

    this.lb = lb;
  }
}
