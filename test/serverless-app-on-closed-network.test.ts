import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import * as ServerlessAppOnClosedNetwork from "../lib/serverless-app-on-closed-network-stack";

test("SnapshotTest", () => {
  const app = new cdk.App();
  const stack =
    new ServerlessAppOnClosedNetwork.ServerlessAppOnClosedNetworkStack(
      app,
      "MyTestStack"
    );
  const template = Template.fromStack(stack).toJSON();

  expect(template).toMatchSnapshot();
});
