import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Network } from "./constructs/network";
import * as iam from "aws-cdk-lib/aws-iam";
import { RemovalPolicy, Token } from "aws-cdk-lib";

export interface TestStackProps extends cdk.StackProps {
  network: Network;
}

export class TestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: TestStackProps) {
    /**
     * Stack which creates following resources:
     * - another vpc and subnets peered to exist one
     * - windows instance for testing
     */
    super(scope, id, props);

    const existingVpc = props.network.vpc;
    const testVpc = new ec2.Vpc(this, "TestVpc", {
      ipAddresses: ec2.IpAddresses.cidr("10.1.0.0/16"),
      maxAzs: 2,
    });

    // peering connection
    const conn = new ec2.CfnVPCPeeringConnection(this, "PerringConnection", {
      peerVpcId: existingVpc.vpcId,
      vpcId: testVpc.vpcId,
    });
    // associate application subnet to connection
    props.network.appSubnets.subnets.map(
      (subnet: ec2.ISubnet, index: number) => {
        new ec2.CfnRoute(this, `exisingVpcRoute${index}`, {
          routeTableId: subnet.routeTable.routeTableId,
          destinationCidrBlock: testVpc.vpcCidrBlock,
          vpcPeeringConnectionId: conn.ref,
        });
      }
    );
    // associate load balancer subnet to connection
    props.network.lbSubnets.subnets.map(
      (subnet: ec2.ISubnet, index: number) => {
        new ec2.CfnRoute(this, `exisingVpcRouteLb${index}`, {
          routeTableId: subnet.routeTable.routeTableId,
          destinationCidrBlock: testVpc.vpcCidrBlock,
          vpcPeeringConnectionId: conn.ref,
        });
      }
    );
    // associate test vpc subnets to connection
    testVpc.publicSubnets.map((subnet: ec2.ISubnet, index: number) => {
      new ec2.CfnRoute(this, `testVpcRoute${index}`, {
        routeTableId: subnet.routeTable.routeTableId,
        destinationCidrBlock: existingVpc.vpcCidrBlock,
        vpcPeeringConnectionId: conn.ref,
      });
    });

    // key pair which will be used to get password for RDP login
    const keyPair = new ec2.CfnKeyPair(this, "KeyPair", {
      keyName: "windows-key-pair",
    });
    keyPair.applyRemovalPolicy(RemovalPolicy.DESTROY);
    new cdk.CfnOutput(this, "GetSSHKeyCommand", {
      value: `aws ssm get-parameter --name /ec2/keypair/${keyPair.getAtt(
        "KeyPairId"
      )} --region ${
        this.region
      } --with-decryption --query Parameter.Value --output text`,
    });

    const windowsAmi = ec2.MachineImage.latestWindows(
      ec2.WindowsVersion.WINDOWS_SERVER_2022_ENGLISH_FULL_BASE
    );
    // allow RDP
    const windowsSg = new ec2.SecurityGroup(this, "WindowsSg", {
      vpc: testVpc,
    });
    windowsSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3389));

    const windowsInstance = new ec2.Instance(this, "windowsInstance", {
      vpc: testVpc,
      vpcSubnets: testVpc.selectSubnets({
        subnetType: ec2.SubnetType.PUBLIC,
      }),
      securityGroup: windowsSg,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.SMALL
      ),
      machineImage: windowsAmi,
      keyName: Token.asString(keyPair.ref),
    });
  }
}
