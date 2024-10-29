const AWS = require("aws-sdk")

// Configure AWS SDK
const ec2 = new AWS.EC2({
    region: "ap-south-1", // Replace with your desired region
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
})

async function createEC2Instance() {
    try {
        // Specify the parameters for the new instance
        const params = {
            ImageId: "ami-0846b753e2af0da6e", // Amazon Linux 2 AMI (replace as needed)
            InstanceType: "t2.micro",
            MinCount: 1,
            MaxCount: 1,
            SecurityGroupIds: ["sg-02554b532f1d6f9ac"], // Replace with your security group ID
            // KeyName: "your-key-pair-name", // Replace with your key pair name
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
        const result = await ec2.runInstances(params).promise()
        const instanceId = result.Instances[0].InstanceId
        console.log(`EC2 Instance created with ID: ${instanceId}`)

        // Tag the instance (optional)
        await ec2
            .createTags({
                Resources: [instanceId],
                Tags: [
                    {
                        Key: "Name",
                        Value: "GitHubActionsEC2Instance",
                    },
                ],
            })
            .promise()
        console.log("Instance tagged successfully")
    } catch (error) {
        console.error("Failed to create EC2 instance:", error)
        process.exit(1)
    }
}

createEC2Instance()
