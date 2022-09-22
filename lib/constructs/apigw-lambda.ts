import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import * as path from "path";
import { Network } from "./network";
import { VpcEndpoints } from "./vpc-endpoints";

export interface ApigwLambdaProps {
  network: Network;
  vpcEndpoints: VpcEndpoints;
}

export class ApigwLambda extends Construct {
  public readonly apigw: apigateway.IRestApi;

  constructor(scope: Construct, id: string, props: ApigwLambdaProps) {
    super(scope, id);

    /**
     * API Gateway / Lambda definitions construct
     */

    const handler = new lambda.Function(this, "LambdaHandler", {
      runtime: lambda.Runtime.PYTHON_3_8,
      code: lambda.Code.fromAsset(path.join(__dirname, "../../lambda")),
      handler: "index.handler",
      vpc: props.network.vpc,
      vpcSubnets: props.network.appSubnets,
    });

    const apigw = new apigateway.LambdaRestApi(this, "ApiGw", {
      endpointConfiguration: {
        types: [apigateway.EndpointType.PRIVATE],
        vpcEndpoints: [props.vpcEndpoints.apigwInterfaceEndpoint],
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
        statusCode: 200,
      },
      handler: handler,
      proxy: true,
      // add iam policy to allow access only from vpc endpoint
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            principals: [new iam.AnyPrincipal()],
            actions: ["execute-api:Invoke"],
            resources: ["execute-api:/*"],
            effect: iam.Effect.DENY,
            conditions: {
              StringNotEquals: {
                "aws:SourceVpce":
                  props.vpcEndpoints.apigwInterfaceEndpoint.vpcEndpointId,
              },
            },
          }),
          new iam.PolicyStatement({
            principals: [new iam.AnyPrincipal()],
            actions: ["execute-api:Invoke"],
            resources: ["execute-api:/*"],
            effect: iam.Effect.ALLOW,
          }),
        ],
      }),
    });

    this.apigw = apigw;
  }
}
