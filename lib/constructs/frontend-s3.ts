import { RemovalPolicy } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as iam from "aws-cdk-lib/aws-iam";
import * as path from "path";
import { Construct } from "constructs";
import { Network } from "./network";
import * as cdk from "aws-cdk-lib";

export interface FrontendS3Props {
  network: Network;
}

export class FrontendS3 extends Construct {
  public readonly bucket: s3.IBucket;

  constructor(scope: Construct, id: string, props: FrontendS3Props) {
    super(scope, id);

    /**
     * S3 bucket construct for frontend
     */
    const appBucket = new s3.Bucket(this, "AppBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // allow access only from specified vpc
    /**
     * NOTE: FOR SECURITY REASON, DENY POLICY SHOULD BE ADDED, HOWEVER,
     * BUCKET DELETION MAY REQUIRE ROOT ACCESS.
     * PLEASE CAREFULLY COMMENT OUT BELOW CODES.
     * https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies-vpc-endpoint.html
     */
    // appBucket.addToResourcePolicy(
    //   new iam.PolicyStatement({
    //     effect: iam.Effect.DENY,
    //     principals: [new iam.AnyPrincipal()],
    //     actions: ["s3:*"],
    //     resources: [
    //       `arn:aws:s3:::${appBucket.bucketName}`,
    //       `arn:aws:s3:::${appBucket.bucketName}/*`,
    //     ],
    //     conditions: {
    //       StringNotEquals: {
    //         "aws:SourceVpc": props.network.vpc.vpcId,
    //       },
    //     },
    //   })
    // );
    appBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.AnyPrincipal()],
        actions: ["s3:*"],
        resources: [
          `arn:aws:s3:::${appBucket.bucketName}`,
          `arn:aws:s3:::${appBucket.bucketName}/*`,
        ],
        conditions: {
          StringEquals: {
            "aws:SourceVpc": props.network.vpc.vpcId,
          },
        },
      })
    );

    // deploy index.html to bucket
    new s3deploy.BucketDeployment(this, "Deploy", {
      sources: [s3deploy.Source.asset(path.join(__dirname, "../../frontend"))],
      destinationBucket: appBucket,
    });

    this.bucket = appBucket;
  }
}
