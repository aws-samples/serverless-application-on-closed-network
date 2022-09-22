import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import { Network } from "./constructs/network";
import { EcsFargate } from "./constructs/ecs-fargate";
import { VpcEndpoints } from "./constructs/vpc-endpoints";
import { ApigwLambda } from "./constructs/apigw-lambda";
import { FrontendS3 } from "./constructs/frontend-s3";

export class ServerlessAppOnClosedNetworkStack extends cdk.Stack {
  public readonly network: Network;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const network = new Network(this, "Network");
    const vpcEndpoints = new VpcEndpoints(this, "VpcEndpoints", { network });
    const ecsFargate = new EcsFargate(this, "EcsFargate", { network });
    const apigwLambda = new ApigwLambda(this, "ApigwLambda", {
      network,
      vpcEndpoints,
    });

    /**
     * Outputs
     */
    new cdk.CfnOutput(this, "FargateALbEndpoint", {
      value: ecsFargate.lb.loadBalancerDnsName,
    });

    // NOTE: private api endpoint must be called by follwing format:
    // https://{rest-api-id}-{vpce-id}.execute-api.{region}.amazonaws.com/{stage}
    // reference: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-api-test-invoke-url.html
    new cdk.CfnOutput(this, "ApiGwEndpointOutput", {
      value: `${apigwLambda.apigw.restApiId}-${
        vpcEndpoints.apigwInterfaceEndpoint.vpcEndpointId
      }.execute-api.${cdk.Stack.of(this).region}.amazonaws.com/${
        apigwLambda.apigw.deploymentStage.stageName
      }/`,
    });

    new cdk.CfnOutput(this, "S3InterfaceEndpointDns", {
      value: cdk.Fn.select(
        0,
        vpcEndpoints.s3InterfaceEndpoint.vpcEndpointDnsEntries
      ),
    });

    this.network = network;
  }
}
