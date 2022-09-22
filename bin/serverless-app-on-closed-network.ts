#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ServerlessAppOnClosedNetworkStack } from "../lib/serverless-app-on-closed-network-stack";
import { TestStack } from "../lib/test-stack";
import { FrontendStack } from "../lib/frontend-stack";
import { fetchBackendOutputs } from "../lib/fetch-backend-outputs";
import * as fs from "fs";
import * as path from "path";

const app = new cdk.App();

/**
 * Create serverless stack which includes:
 * - Network (VPC, subnet, etc)
 * - ALB / Fargate, API Gateway / Lambda
 */
const serverlessStack = new ServerlessAppOnClosedNetworkStack(
  app,
  "ServerlessAppOnClosedNetworkStack",
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
  }
);

createFrontend();

async function createFrontend() {
  /**
   * Create frontend stack which includes:
   * - S3 bucket
   */
  const outputs = await fetchBackendOutputs(serverlessStack);

  if (outputs) {
    // create `index.html` from template by replacing ALB / API gateway endpoints.
    const html = fs
      .readFileSync(
        path.join(__dirname, "../frontend/index_template.html"),
        "utf8"
      )
      .replace("###ALB_ENDPOINT###", outputs!.FargateALbEndpoint)
      .replace("###APIGW_ENDPOINT###", outputs!.ApiGwEndpointOutput);
    fs.writeFileSync(path.join(__dirname, "../frontend/index.html"), html);

    // NOTE: output format like:
    // "Z1HUB23UULQXV:*.vpce-01abc23456de78f9g-12abccd3.ec2.us-east-1.vpce.amazonaws.com"
    const s3EndpointDns =
      outputs!.S3InterfaceEndpointDns.split(":")[1].split("*.")[1];

    const frontendStack = new FrontendStack(app, "FrontendStack", {
      network: serverlessStack.network,
      s3InterfaceEndpointDns: s3EndpointDns,
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
      },
    });
    frontendStack.addDependency(serverlessStack);
  }
}

/**
 * Create test stack which includes:
 * - Network (VPC, subnet, peering connection, editing route table, etc)
 * - Windows instance
 */
const testStack = new TestStack(app, "TestStack", {
  network: serverlessStack.network,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

testStack.addDependency(serverlessStack);
