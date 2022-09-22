import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { Network } from "./network";

export interface VpcEndpointsProps {
  network: Network;
}

export class VpcEndpoints extends Construct {
  public readonly s3InterfaceEndpoint: ec2.InterfaceVpcEndpoint;
  public readonly apigwInterfaceEndpoint: ec2.InterfaceVpcEndpoint;

  constructor(scope: Construct, id: string, props: VpcEndpointsProps) {
    super(scope, id);

    /***
     * Vpc endpoints definitions construct
     */

    // NOTE: security group needs to allow access from other internal private networks
    const sg = new ec2.SecurityGroup(this, "EndpointSg", {
      vpc: props.network.vpc,
    });
    // NOTE: please remind that serverless stack's network is 10.0.0.0/16 and
    // test stack's network is 10.1.0.0/16
    sg.addIngressRule(ec2.Peer.ipv4("10.0.0.0/8"), ec2.Port.tcp(443));

    // S3 interface endpoint for access to frontend from private subnets
    const s3InterfaceEndpoint = new ec2.InterfaceVpcEndpoint(
      this,
      "S3InterfaceEndpoint",
      {
        vpc: props.network.vpc,
        service: ec2.InterfaceVpcEndpointAwsService.S3,
        privateDnsEnabled: false,
        subnets: props.network.appSubnets,
        securityGroups: [sg],
      }
    );

    // Endpoint for cloudwatch logs
    new ec2.InterfaceVpcEndpoint(this, "LogsEndpoint", {
      vpc: props.network.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      subnets: props.network.appSubnets,
      securityGroups: [sg],
    });

    // Endpoints which enables pulling docker image from ECR
    // reference: https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html
    new ec2.InterfaceVpcEndpoint(this, "EcrApiEndpoint", {
      vpc: props.network.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
      subnets: props.network.appSubnets,
      securityGroups: [sg],
    });
    new ec2.InterfaceVpcEndpoint(this, "EcrDkrEndpoint", {
      vpc: props.network.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      subnets: props.network.appSubnets,
      securityGroups: [sg],
    });
    new ec2.GatewayVpcEndpoint(this, "S3GatewayEndpoint", {
      vpc: props.network.vpc,
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    // Endpoint for api gateway
    const apiGwEndpoint = new ec2.InterfaceVpcEndpoint(this, "ApiGwEndpoint", {
      vpc: props.network.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
      subnets: props.network.appSubnets,
      privateDnsEnabled: true,
      securityGroups: [sg],
    });

    this.s3InterfaceEndpoint = s3InterfaceEndpoint;
    this.apigwInterfaceEndpoint = apiGwEndpoint;
  }
}
