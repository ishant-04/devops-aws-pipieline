// const {
//     EC2Client,
//     CreateVpcCommand,
//     CreateSubnetCommand,
//     CreateInternetGatewayCommand,
//     AttachInternetGatewayCommand,
//     CreateRouteTableCommand,
//     CreateRouteCommand,
//     AssociateRouteTableCommand,
//     CreateSecurityGroupCommand,
//     AuthorizeSecurityGroupIngressCommand,
//     RunInstancesCommand,
//     CreateTagsCommand,
//     DescribeSubnetsCommand,
// } = require("@aws-sdk/client-ec2")
// const {
//     SSMClient,
//     GetParameterCommand,
//     SendCommandCommand,
// } = require("@aws-sdk/client-ssm")

// const {
//     IAMClient,
//     CreateRoleCommand,
//     AttachRolePolicyCommand,
//     CreateInstanceProfileCommand,
//     AddRoleToInstanceProfileCommand,
//     GetInstanceProfileCommand,
//     waitUntilInstanceProfileExists,
// } = require("@aws-sdk/client-iam")

// // Configure AWS SDK clients
// const region = "ap-south-1"
// const ec2Client = new EC2Client({ region })
// const ssmClient = new SSMClient({ region })
// const iamClient = new IAMClient({ region })
// const { DescribeVpcsCommand } = require("@aws-sdk/client-ec2")

// async function getLatestAmiId() {
//     try {
//         const parameter = await ssmClient.send(
//             new GetParameterCommand({
//                 Name: "/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2",
//             })
//         )
//         return parameter.Parameter.Value
//     } catch (error) {
//         console.error("Failed to get AMI ID:", error)
//         process.exit(1)
//     }
// }

// async function getOrCreateSubnet(vpcId) {
//     try {
//         const desiredCidrBlock = "10.0.1.0/24" // Your required CIDR block

//         // Describe subnets in the VPC
//         const data = await ec2Client.send(
//             new DescribeSubnetsCommand({
//                 Filters: [
//                     {
//                         Name: "vpc-id",
//                         Values: [vpcId],
//                     },
//                     {
//                         Name: "cidr-block",
//                         Values: [desiredCidrBlock],
//                     },
//                     {
//                         Name: "tag:Name",
//                         Values: ["MySubnet"],
//                     },
//                 ],
//             })
//         )

//         if (data.Subnets.length > 0) {
//             // A subnet matching the desired configuration exists
//             const subnet = data.Subnets[0]
//             const subnetId = subnet.SubnetId
//             console.log(`Existing Subnet found with ID: ${subnetId}`)
//             return subnetId
//         } else {
//             // No matching subnet found, create a new one
//             const subnetData = await ec2Client.send(
//                 new CreateSubnetCommand({
//                     VpcId: vpcId,
//                     CidrBlock: desiredCidrBlock,
//                     TagSpecifications: [
//                         {
//                             ResourceType: "subnet",
//                             Tags: [{ Key: "Name", Value: "MySubnet" }],
//                         },
//                     ],
//                 })
//             )
//             const subnetId = subnetData.Subnet.SubnetId
//             console.log(`Subnet created with ID: ${subnetId}`)
//             return subnetId
//         }
//     } catch (error) {
//         console.error("Failed to get or create Subnet:", error)
//         process.exit(1)
//     }
// }

// async function createResources() {
//     try {
//         // 1. VPC
//         let vpcId = await getExistingVpcId()

//         if (!vpcId) {
//             // Create VPC if it doesn't exist
//             const vpcData = await ec2Client.send(
//                 new CreateVpcCommand({
//                     CidrBlock: "10.0.0.0/16",
//                     TagSpecifications: [
//                         {
//                             ResourceType: "vpc",
//                             Tags: [{ Key: "Name", Value: "MyVPC" }],
//                         },
//                     ],
//                 })
//             )
//             vpcId = vpcData.Vpc.VpcId
//             console.log(`VPC created with ID: ${vpcId}`)
//             // You may need to wait until the VPC is available
//         } else {
//             console.log(`Reusing existing VPC with ID: ${vpcId}`)
//         }

//         // 2. Create Subnet
//         const subnetId = await getOrCreateSubnet(vpcId)

//         // 3. Create Internet Gateway
//         const igwData = await ec2Client.send(
//             new CreateInternetGatewayCommand({
//                 TagSpecifications: [
//                     {
//                         ResourceType: "internet-gateway",
//                         Tags: [{ Key: "Name", Value: "MyInternetGateway" }],
//                     },
//                 ],
//             })
//         )
//         const igwId = igwData.InternetGateway.InternetGatewayId
//         console.log(`Internet Gateway created with ID: ${igwId}`)

//         // 4. Attach Internet Gateway to VPC
//         await ec2Client.send(
//             new AttachInternetGatewayCommand({
//                 InternetGatewayId: igwId,
//                 VpcId: vpcId,
//             })
//         )
//         console.log(`Internet Gateway ${igwId} attached to VPC ${vpcId}`)

//         // 5. Create Route Table
//         const routeTableData = await ec2Client.send(
//             new CreateRouteTableCommand({
//                 VpcId: vpcId,
//                 TagSpecifications: [
//                     {
//                         ResourceType: "route-table",
//                         Tags: [{ Key: "Name", Value: "MyRouteTable" }],
//                     },
//                 ],
//             })
//         )
//         const routeTableId = routeTableData.RouteTable.RouteTableId
//         console.log(`Route Table created with ID: ${routeTableId}`)

//         // 6. Create Route to Internet Gateway
//         await ec2Client.send(
//             new CreateRouteCommand({
//                 DestinationCidrBlock: "0.0.0.0/0",
//                 GatewayId: igwId,
//                 RouteTableId: routeTableId,
//             })
//         )
//         console.log(
//             `Route to Internet Gateway ${igwId} created in Route Table ${routeTableId}`
//         )

//         // 7. Associate Route Table with Subnet
//         await ec2Client.send(
//             new AssociateRouteTableCommand({
//                 SubnetId: subnetId,
//                 RouteTableId: routeTableId,
//             })
//         )
//         console.log(
//             `Route Table ${routeTableId} associated with Subnet ${subnetId}`
//         )

//         // 8. Create Security Group
//         const sgData = await ec2Client.send(
//             new CreateSecurityGroupCommand({
//                 Description: "Allow SSH and HTTP access",
//                 GroupName: "MySecurityGroup",
//                 VpcId: vpcId,
//                 TagSpecifications: [
//                     {
//                         ResourceType: "security-group",
//                         Tags: [{ Key: "Name", Value: "MySecurityGroup" }],
//                     },
//                 ],
//             })
//         )
//         const securityGroupId = sgData.GroupId
//         console.log(`Security Group created with ID: ${securityGroupId}`)

//         // 9. Authorize Inbound Rules
//         await ec2Client.send(
//             new AuthorizeSecurityGroupIngressCommand({
//                 GroupId: securityGroupId,
//                 IpPermissions: [
//                     {
//                         IpProtocol: "tcp",
//                         FromPort: 22,
//                         ToPort: 22,
//                         IpRanges: [{ CidrIp: "0.0.0.0/0" }],
//                     },
//                     {
//                         IpProtocol: "tcp",
//                         FromPort: 80,
//                         ToPort: 80,
//                         IpRanges: [{ CidrIp: "0.0.0.0/0" }],
//                     },
//                 ],
//             })
//         )
//         console.log(`Inbound rules added to Security Group ${securityGroupId}`)

//         // Return IDs for use in instance creation
//         return { subnetId, securityGroupId }
//     } catch (error) {
//         console.error("Failed to create resources:", error)
//         process.exit(1)
//     }
// }

// async function createIamRole() {
//     const roleName = "EC2SSMRole"
//     const instanceProfileName = "EC2SSMInstanceProfile"

//     // 1. Create IAM Role
//     try {
//         const assumeRolePolicyDocument = JSON.stringify({
//             Version: "2012-10-17",
//             Statement: [
//                 {
//                     Effect: "Allow",
//                     Principal: {
//                         Service: "ec2.amazonaws.com",
//                     },
//                     Action: "sts:AssumeRole",
//                 },
//             ],
//         })

//         await iamClient.send(
//             new CreateRoleCommand({
//                 RoleName: roleName,
//                 AssumeRolePolicyDocument: assumeRolePolicyDocument,
//                 Description: "Role for EC2 to access SSM",
//             })
//         )
//         console.log(`IAM Role ${roleName} created`)
//     } catch (error) {
//         if (
//             error.name === "EntityAlreadyExistsException" ||
//             error.name === "EntityAlreadyExists" ||
//             (error.Code && error.Code === "EntityAlreadyExists")
//         ) {
//             console.log(`IAM Role ${roleName} already exists`)
//         } else {
//             console.error("Failed to create IAM Role:", error)
//             process.exit(1)
//         }
//     }

//     // 2. Attach Policy to Role
//     try {
//         await iamClient.send(
//             new AttachRolePolicyCommand({
//                 RoleName: roleName,
//                 PolicyArn:
//                     "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
//             })
//         )
//         console.log(`Policy attached to IAM Role ${roleName}`)
//     } catch (error) {
//         if (
//             error.name === "EntityAlreadyExistsException" ||
//             error.name === "EntityAlreadyExists" ||
//             (error.Code && error.Code === "EntityAlreadyExists")
//         ) {
//             console.log(`Policy already attached to IAM Role ${roleName}`)
//         } else {
//             console.error("Failed to attach policy to IAM Role:", error)
//             process.exit(1)
//         }
//     }

//     // 3. Create Instance Profile
//     try {
//         await iamClient.send(
//             new CreateInstanceProfileCommand({
//                 InstanceProfileName: instanceProfileName,
//             })
//         )
//         console.log(`Instance Profile ${instanceProfileName} created`)
//     } catch (error) {
//         if (
//             error.name === "EntityAlreadyExistsException" ||
//             error.name === "EntityAlreadyExists" ||
//             (error.Code && error.Code === "EntityAlreadyExists")
//         ) {
//             console.log(
//                 `Instance Profile ${instanceProfileName} already exists`
//             )
//         } else {
//             console.error("Failed to create Instance Profile:", error)
//             process.exit(1)
//         }
//     }

//     // 4. Add Role to Instance Profile
//     try {
//         await iamClient.send(
//             new AddRoleToInstanceProfileCommand({
//                 InstanceProfileName: instanceProfileName,
//                 RoleName: roleName,
//             })
//         )
//         console.log(
//             `Role ${roleName} added to Instance Profile ${instanceProfileName}`
//         )
//     } catch (error) {
//         if (
//             error.name === "LimitExceeded" ||
//             error.name === "EntityAlreadyExistsException" ||
//             error.name === "EntityAlreadyExists" ||
//             (error.Code && error.Code === "EntityAlreadyExists")
//         ) {
//             console.log(
//                 `Role ${roleName} is already associated with the Instance Profile`
//             )
//         } else {
//             console.error("Failed to add Role to Instance Profile:", error)
//             process.exit(1)
//         }
//     }

//     // 5. Wait for the Instance Profile to be available
//     const params = {
//         InstanceProfileName: instanceProfileName,
//     }
//     await waitUntilInstanceProfileExists(
//         { client: iamClient, maxWaitTime: 30 },
//         params
//     )
//     console.log(`Instance Profile ${instanceProfileName} is now available`)

//     // 6. Get the Instance Profile ARN
//     const getInstanceProfileResponse = await iamClient.send(
//         new GetInstanceProfileCommand({
//             InstanceProfileName: instanceProfileName,
//         })
//     )
//     const instanceProfileArn = getInstanceProfileResponse.InstanceProfile.Arn

//     return instanceProfileArn
// }

// async function runSSMCommands(instanceId) {
//     try {
//         const command = new SendCommandCommand({
//             InstanceIds: [instanceId],
//             DocumentName: "AWS-RunShellScript",
//             Parameters: {
//                 commands: [
//                     "sudo yum install -y git",
//                     "sudo amazon-linux-extras install -y docker",
//                     "sudo service docker start",
//                     "sudo usermod -a -G docker ec2-user",
//                     'echo "Docker and Git installed" >> /home/ec2-user/setup.log',
//                 ],
//             },
//         })

//         const response = await ssmClient.send(command)
//         console.log(
//             `SSM Command sent. Command ID: ${response.Command.CommandId}`
//         )
//     } catch (error) {
//         console.error("Failed to run SSM command:", error)
//         process.exit(1)
//     }
// }

// async function getExistingVpcId() {
//     try {
//         const data = await ec2Client.send(
//             new DescribeVpcsCommand({
//                 Filters: [
//                     {
//                         Name: "tag:Name",
//                         Values: ["MyVPC"],
//                     },
//                 ],
//             })
//         )
//         if (data.Vpcs.length > 0) {
//             const vpcId = data.Vpcs[0].VpcId
//             console.log(`Existing VPC found with ID: ${vpcId}`)
//             return vpcId
//         } else {
//             return null
//         }
//     } catch (error) {
//         console.error("Failed to describe VPCs:", error)
//         process.exit(1)
//     }
// }

// async function createEC2Instance(
//     subnetId,
//     securityGroupId,
//     instanceProfileArn
// ) {
//     try {
//         const amiId = await getLatestAmiId()

//         const params = {
//             ImageId: amiId,
//             InstanceType: "t3.micro",
//             MinCount: 1,
//             MaxCount: 1,
//             IamInstanceProfile: {
//                 Arn: instanceProfileArn,
//             },
//             NetworkInterfaces: [
//                 {
//                     DeviceIndex: 0,
//                     SubnetId: subnetId,
//                     Groups: [securityGroupId],
//                     AssociatePublicIpAddress: true,
//                 },
//             ],
//             TagSpecifications: [
//                 {
//                     ResourceType: "instance",
//                     Tags: [{ Key: "Name", Value: "GitHubActionsEC2Instance" }],
//                 },
//             ],
//             UserData: Buffer.from(
//                 `#!/bin/bash
// sudo yum update -y
// sudo yum install -y httpd
// sudo systemctl start httpd
// sudo systemctl enable httpd
// echo "Hello World from $(hostname -f)" > /var/www/html/index.html
// `
//             ).toString("base64"),
//         }

//         // Run the EC2 instance
//         const runInstancesCommand = new RunInstancesCommand(params)
//         const result = await ec2Client.send(runInstancesCommand)
//         const instanceId = result.Instances[0].InstanceId
//         console.log(`EC2 Instance created with ID: ${instanceId}`)

//         return instanceId
//     } catch (error) {
//         console.error("Failed to create EC2 instance:", error)
//         process.exit(1)
//     }
// }

// async function main() {
//     const { subnetId, securityGroupId } = await createResources()
//     const instanceProfileArn = await createIamRole()
//     const instanceId = await createEC2Instance(
//         subnetId,
//         securityGroupId,
//         instanceProfileArn
//     )

//     console.log("Waiting for instance to be in running state...")
//     await new Promise((resolve) => setTimeout(resolve, 60000)) // Wait for 60 seconds

//     await runSSMCommands(instanceId)
// }

// main()

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
    DescribeSubnetsCommand,
    DescribeVpcsCommand,
    waitUntilInstanceStatusOk,
} = require("@aws-sdk/client-ec2")

const {
    SSMClient,
    GetParameterCommand,
    SendCommandCommand,
    DescribeInstanceInformationCommand,
} = require("@aws-sdk/client-ssm")

const {
    IAMClient,
    CreateRoleCommand,
    AttachRolePolicyCommand,
    CreateInstanceProfileCommand,
    AddRoleToInstanceProfileCommand,
    GetInstanceProfileCommand,
    waitUntilInstanceProfileExists,
} = require("@aws-sdk/client-iam")

// Configure AWS SDK clients
const region = "ap-south-1"
const ec2Client = new EC2Client({ region })
const ssmClient = new SSMClient({ region })
const iamClient = new IAMClient({ region })

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

async function getOrCreateSubnet(vpcId) {
    try {
        const desiredCidrBlock = "10.0.1.0/24" // Your required CIDR block

        // Describe subnets in the VPC
        const data = await ec2Client.send(
            new DescribeSubnetsCommand({
                Filters: [
                    {
                        Name: "vpc-id",
                        Values: [vpcId],
                    },
                    {
                        Name: "cidr-block",
                        Values: [desiredCidrBlock],
                    },
                    {
                        Name: "tag:Name",
                        Values: ["MySubnet"],
                    },
                ],
            })
        )

        if (data.Subnets.length > 0) {
            // A subnet matching the desired configuration exists
            const subnet = data.Subnets[0]
            const subnetId = subnet.SubnetId
            console.log(`Existing Subnet found with ID: ${subnetId}`)
            return subnetId
        } else {
            // No matching subnet found, create a new one
            const subnetData = await ec2Client.send(
                new CreateSubnetCommand({
                    VpcId: vpcId,
                    CidrBlock: desiredCidrBlock,
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
            return subnetId
        }
    } catch (error) {
        console.error("Failed to get or create Subnet:", error)
        process.exit(1)
    }
}

async function getExistingVpcId() {
    try {
        const data = await ec2Client.send(
            new DescribeVpcsCommand({
                Filters: [
                    {
                        Name: "tag:Name",
                        Values: ["MyVPC"],
                    },
                ],
            })
        )
        if (data.Vpcs.length > 0) {
            const vpcId = data.Vpcs[0].VpcId
            console.log(`Existing VPC found with ID: ${vpcId}`)
            return vpcId
        } else {
            return null
        }
    } catch (error) {
        console.error("Failed to describe VPCs:", error)
        process.exit(1)
    }
}

async function createResources() {
    try {
        // 1. VPC
        let vpcId = await getExistingVpcId()

        if (!vpcId) {
            // Create VPC if it doesn't exist
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
            vpcId = vpcData.Vpc.VpcId
            console.log(`VPC created with ID: ${vpcId}`)
            // You may need to wait until the VPC is available
        } else {
            console.log(`Reusing existing VPC with ID: ${vpcId}`)
        }

        // 2. Create Subnet
        const subnetId = await getOrCreateSubnet(vpcId)

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

async function createIamRole() {
    const roleName = "EC2SSMRole"
    const instanceProfileName = "EC2SSMInstanceProfile"

    // 1. Create IAM Role
    try {
        const assumeRolePolicyDocument = JSON.stringify({
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: {
                        Service: "ec2.amazonaws.com",
                    },
                    Action: "sts:AssumeRole",
                },
            ],
        })

        await iamClient.send(
            new CreateRoleCommand({
                RoleName: roleName,
                AssumeRolePolicyDocument: assumeRolePolicyDocument,
                Description: "Role for EC2 to access SSM",
            })
        )
        console.log(`IAM Role ${roleName} created`)
    } catch (error) {
        if (
            error.name === "EntityAlreadyExistsException" ||
            error.name === "EntityAlreadyExists" ||
            (error.Code && error.Code === "EntityAlreadyExists")
        ) {
            console.log(`IAM Role ${roleName} already exists`)
        } else {
            console.error("Failed to create IAM Role:", error)
            process.exit(1)
        }
    }

    // 2. Attach Policy to Role
    try {
        await iamClient.send(
            new AttachRolePolicyCommand({
                RoleName: roleName,
                PolicyArn:
                    "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
            })
        )
        console.log(`Policy attached to IAM Role ${roleName}`)
    } catch (error) {
        if (
            error.name === "EntityAlreadyExistsException" ||
            error.name === "EntityAlreadyExists" ||
            (error.Code && error.Code === "EntityAlreadyExists")
        ) {
            console.log(`Policy already attached to IAM Role ${roleName}`)
        } else {
            console.error("Failed to attach policy to IAM Role:", error)
            process.exit(1)
        }
    }

    // 3. Create Instance Profile
    try {
        await iamClient.send(
            new CreateInstanceProfileCommand({
                InstanceProfileName: instanceProfileName,
            })
        )
        console.log(`Instance Profile ${instanceProfileName} created`)
    } catch (error) {
        if (
            error.name === "EntityAlreadyExistsException" ||
            error.name === "EntityAlreadyExists" ||
            (error.Code && error.Code === "EntityAlreadyExists")
        ) {
            console.log(
                `Instance Profile ${instanceProfileName} already exists`
            )
        } else {
            console.error("Failed to create Instance Profile:", error)
            process.exit(1)
        }
    }

    // 4. Add Role to Instance Profile
    try {
        await iamClient.send(
            new AddRoleToInstanceProfileCommand({
                InstanceProfileName: instanceProfileName,
                RoleName: roleName,
            })
        )
        console.log(
            `Role ${roleName} added to Instance Profile ${instanceProfileName}`
        )
    } catch (error) {
        if (
            error.name === "LimitExceeded" ||
            error.name === "EntityAlreadyExistsException" ||
            error.name === "EntityAlreadyExists" ||
            (error.Code && error.Code === "EntityAlreadyExists")
        ) {
            console.log(
                `Role ${roleName} is already associated with the Instance Profile`
            )
        } else {
            console.error("Failed to add Role to Instance Profile:", error)
            process.exit(1)
        }
    }

    // 5. Wait for the Instance Profile to be available
    const params = {
        InstanceProfileName: instanceProfileName,
    }
    await waitUntilInstanceProfileExists(
        { client: iamClient, maxWaitTime: 30 },
        params
    )
    console.log(`Instance Profile ${instanceProfileName} is now available`)

    // 6. Get the Instance Profile ARN
    const getInstanceProfileResponse = await iamClient.send(
        new GetInstanceProfileCommand({
            InstanceProfileName: instanceProfileName,
        })
    )
    const instanceProfileArn = getInstanceProfileResponse.InstanceProfile.Arn

    return instanceProfileArn
}

async function createEC2Instance(
    subnetId,
    securityGroupId,
    instanceProfileArn
) {
    try {
        const amiId = await getLatestAmiId()

        const params = {
            ImageId: amiId,
            InstanceType: "t3.micro",
            MinCount: 1,
            MaxCount: 1,
            IamInstanceProfile: {
                Arn: instanceProfileArn,
            },
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

async function waitForInstanceReady(instanceId) {
    try {
        await waitUntilInstanceStatusOk(
            {
                client: ec2Client,
                maxWaitTime: 300, // Maximum wait time in seconds
                minDelay: 15, // Minimum delay between checks in seconds
            },
            { InstanceIds: [instanceId] }
        )
        console.log(`Instance ${instanceId} is now in 'ok' status.`)
    } catch (error) {
        console.error("Error waiting for instance to be ready:", error)
        process.exit(1)
    }
}

async function waitForSSMInstance(instanceId) {
    try {
        const maxAttempts = 20
        const delay = 15 // seconds

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const response = await ssmClient.send(
                new DescribeInstanceInformationCommand({
                    Filters: [
                        {
                            Key: "InstanceIds",
                            Values: [instanceId],
                        },
                    ],
                })
            )

            if (response.InstanceInformationList.length > 0) {
                console.log(
                    `Instance ${instanceId} is now registered with SSM.`
                )
                return
            }

            console.log(
                `Waiting for instance ${instanceId} to register with SSM... (Attempt ${attempt})`
            )
            await new Promise((resolve) => setTimeout(resolve, delay * 1000))
        }

        console.error(
            `Instance ${instanceId} did not register with SSM within the expected time.`
        )
        process.exit(1)
    } catch (error) {
        console.error("Error waiting for instance to register with SSM:", error)
        process.exit(1)
    }
}

async function runSSMCommands(instanceId) {
    try {
        const command = new SendCommandCommand({
            InstanceIds: [instanceId],
            DocumentName: "AWS-RunShellScript",
            Parameters: {
                commands: [
                    "sudo yum install -y git",
                    "sudo amazon-linux-extras install -y docker",
                    "sudo service docker start",
                    "sudo usermod -a -G docker ec2-user",
                    'echo "Docker and Git installed" >> /home/ec2-user/setup.log',
                ],
            },
        })

        const response = await ssmClient.send(command)
        console.log(
            `SSM Command sent. Command ID: ${response.Command.CommandId}`
        )
    } catch (error) {
        console.error("Failed to run SSM command:", error)
        process.exit(1)
    }
}

async function main() {
    const { subnetId, securityGroupId } = await createResources()
    const instanceProfileArn = await createIamRole()
    const instanceId = await createEC2Instance(
        subnetId,
        securityGroupId,
        instanceProfileArn
    )

    console.log("Waiting for instance to be in running state...")
    await waitForInstanceReady(instanceId)
    await waitForSSMInstance(instanceId)

    await runSSMCommands(instanceId)
}

main()
