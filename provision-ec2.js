const {
    EC2Client,
    CreateVpcCommand,
    CreateSubnetCommand,
    CreateInternetGatewayCommand,
    AttachInternetGatewayCommand,
    CreateRouteTableCommand,
    CreateRouteCommand,
    AssociateRouteTableCommand,
    CreateSecurityGroupCommand,
    AuthorizeSecurityGroupIngressCommand,
    RunInstancesCommand,
    CreateTagsCommand,
} = require("@aws-sdk/client-ec2")
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm")

// Configure AWS SDK clients
const region = "us-east-1"
const ec2Client = new EC2Client({ region })
const ssmClient = new SSMClient({ region })

async function getLatestAmiId() {
    try {
        const parameter = await ssmClient.send(
            new GetParameterCommand({
                Name: "/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2",
            })
        )
        return parameter.Parameter.Value
    } catch (error) {
        console.error("Failed to get AMI ID:", error)
        process.exit(1)
    }
}

async function createResources() {
    try {
        // 1. Create VPC
        const vpcData = await ec2Client.send(
            new CreateVpcCommand({
                CidrBlock: "10.0.0.0/16",
                TagSpecifications: [
                    {
                        ResourceType: "vpc",
                        Tags: [{ Key: "Name", Value: "MyVPC" }],
                    },
                ],
            })
        )
        const vpcId = vpcData.Vpc.VpcId
        console.log(`VPC created with ID: ${vpcId}`)

        // 2. Create Subnet
        const subnetData = await ec2Client.send(
            new CreateSubnetCommand({
                VpcId: vpcId,
                CidrBlock: "10.0.1.0/24",
                TagSpecifications: [
                    {
                        ResourceType: "subnet",
                        Tags: [{ Key: "Name", Value: "MySubnet" }],
                    },
                ],
            })
        )
        const subnetId = subnetData.Subnet.SubnetId
        console.log(`Subnet created with ID: ${subnetId}`)

        // 3. Create Internet Gateway
        const igwData = await ec2Client.send(
            new CreateInternetGatewayCommand({
                TagSpecifications: [
                    {
                        ResourceType: "internet-gateway",
                        Tags: [{ Key: "Name", Value: "MyInternetGateway" }],
                    },
                ],
            })
        )
        const igwId = igwData.InternetGateway.InternetGatewayId
        console.log(`Internet Gateway created with ID: ${igwId}`)

        // 4. Attach Internet Gateway to VPC
        await ec2Client.send(
            new AttachInternetGatewayCommand({
                InternetGatewayId: igwId,
                VpcId: vpcId,
            })
        )
        console.log(`Internet Gateway ${igwId} attached to VPC ${vpcId}`)

        // 5. Create Route Table
        const routeTableData = await ec2Client.send(
            new CreateRouteTableCommand({
                VpcId: vpcId,
                TagSpecifications: [
                    {
                        ResourceType: "route-table",
                        Tags: [{ Key: "Name", Value: "MyRouteTable" }],
                    },
                ],
            })
        )
        const routeTableId = routeTableData.RouteTable.RouteTableId
        console.log(`Route Table created with ID: ${routeTableId}`)

        // 6. Create Route to Internet Gateway
        await ec2Client.send(
            new CreateRouteCommand({
                DestinationCidrBlock: "0.0.0.0/0",
                GatewayId: igwId,
                RouteTableId: routeTableId,
            })
        )
        console.log(
            `Route to Internet Gateway ${igwId} created in Route Table ${routeTableId}`
        )

        // 7. Associate Route Table with Subnet
        await ec2Client.send(
            new AssociateRouteTableCommand({
                SubnetId: subnetId,
                RouteTableId: routeTableId,
            })
        )
        console.log(
            `Route Table ${routeTableId} associated with Subnet ${subnetId}`
        )

        // 8. Create Security Group
        const sgData = await ec2Client.send(
            new CreateSecurityGroupCommand({
                Description: "Allow SSH and HTTP access",
                GroupName: "MySecurityGroup",
                VpcId: vpcId,
                TagSpecifications: [
                    {
                        ResourceType: "security-group",
                        Tags: [{ Key: "Name", Value: "MySecurityGroup" }],
                    },
                ],
            })
        )
        const securityGroupId = sgData.GroupId
        console.log(`Security Group created with ID: ${securityGroupId}`)

        // 9. Authorize Inbound Rules
        await ec2Client.send(
            new AuthorizeSecurityGroupIngressCommand({
                GroupId: securityGroupId,
                IpPermissions: [
                    {
                        IpProtocol: "tcp",
                        FromPort: 22,
                        ToPort: 22,
                        IpRanges: [{ CidrIp: "0.0.0.0/0" }],
                    },
                    {
                        IpProtocol: "tcp",
                        FromPort: 80,
                        ToPort: 80,
                        IpRanges: [{ CidrIp: "0.0.0.0/0" }],
                    },
                ],
            })
        )
        console.log(`Inbound rules added to Security Group ${securityGroupId}`)

        // Return IDs for use in instance creation
        return { subnetId, securityGroupId }
    } catch (error) {
        console.error("Failed to create resources:", error)
        process.exit(1)
    }
}

async function createEC2Instance(subnetId, securityGroupId) {
    try {
        const amiId = await getLatestAmiId()

        const params = {
            ImageId: amiId,
            InstanceType: "t2.micro",
            MinCount: 1,
            MaxCount: 1,
            // KeyName: "your-key-pair-name",
            NetworkInterfaces: [
                {
                    DeviceIndex: 0,
                    SubnetId: subnetId,
                    Groups: [securityGroupId],
                    AssociatePublicIpAddress: true,
                },
            ],
            TagSpecifications: [
                {
                    ResourceType: "instance",
                    Tags: [{ Key: "Name", Value: "GitHubActionsEC2Instance" }],
                },
            ],
            UserData: Buffer.from(
                `#!/bin/bash
sudo yum update -y
sudo yum install -y httpd
sudo systemctl start httpd
sudo systemctl enable httpd
echo "Hello World from $(hostname -f)" > /var/www/html/index.html
`
            ).toString("base64"),
        }

        // Run the EC2 instance
        const runInstancesCommand = new RunInstancesCommand(params)
        const result = await ec2Client.send(runInstancesCommand)
        const instanceId = result.Instances[0].InstanceId
        console.log(`EC2 Instance created with ID: ${instanceId}`)

        return instanceId
    } catch (error) {
        console.error("Failed to create EC2 instance:", error)
        process.exit(1)
    }
}

async function main() {
    const { subnetId, securityGroupId } = await createResources()
    const instanceId = await createEC2Instance(subnetId, securityGroupId)

    // Additional steps (e.g., wait for instance to be ready) can be added here

    // For Task 3, we'll invoke configuration management after this
}

main()
