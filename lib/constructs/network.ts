import * as ec2 from "aws-cdk-lib/aws-ec2";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export interface NetworkProps {}

export class Network extends Construct {
  public readonly vpc: IVpc;
  public readonly lbSubnets: ec2.SelectedSubnets;
  public readonly appSubnets: ec2.SelectedSubnets;

  constructor(scope: Construct, id: string, props?: NetworkProps) {
    super(scope, id);

    /**
     * Network definitions construct
     */
    const vpc = new ec2.Vpc(this, "Vpc", {
      ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
      maxAzs: 2,
      // configure private isolated subnets
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "app",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        {
          cidrMask: 24,
          name: "db", // in this example this subnet will not be used (just for reference)
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        {
          cidrMask: 24,
          name: "lb",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    const appSubnets = vpc.selectSubnets({
      subnetGroupName: "app",
    });
    const lbSubnets = vpc.selectSubnets({
      subnetGroupName: "lb",
    });

    /**
     * NOTE: if there already exist vpc and subnets,
     * refer by id (or attributes e.g. subnet group) such as following:
     */
    // const vpc = ec2.Vpc.fromLookup(this, "Vpc", {
    //   vpcId: "vpc-xxxxxxx",
    // });
    // const appSubnets = vpc.selectSubnets({
    //   subnets: [
    //     ec2.Subnet.fromSubnetAttributes(this, "subnet-aaa", {
    //       subnetId: "subnet-xxxxxxx",
    //     }),
    //     ec2.Subnet.fromSubnetAttributes(this, "subnet-bbb", {
    //       subnetId: "subnet-yyyyyyy",
    //     }),
    //   ],
    // });

    this.vpc = vpc;
    this.lbSubnets = lbSubnets;
    this.appSubnets = appSubnets;
  }
}
