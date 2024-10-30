# devops-aws-pipieline
#test1
To test pipeline 

1. fork and clone repo
2. Go to AWS console and set up a new IAM user with the below security policies 
  {
  	"Version": "2012-10-17",
  	"Statement": [
  		{
  			"Sid": "EC2Permissions",
  			"Effect": "Allow",
  			"Action": [
  				"ec2:CreateVpc",
  				"ec2:CreateSubnet",
  				"ec2:CreateInternetGateway",
  				"ec2:AttachInternetGateway",
  				"ec2:CreateRouteTable",
  				"ec2:CreateRoute",
  				"ec2:AssociateRouteTable",
  				"ec2:CreateSecurityGroup",
  				"ec2:AuthorizeSecurityGroupIngress",
  				"ec2:RunInstances",
  				"ec2:DescribeInstances",
  				"ec2:CreateTags",
  				"ec2:DescribeVpcs",
  				"ec2:DescribeSubnets",
  				"ec2:DescribeSecurityGroups",
  				"ec2:DescribeRouteTables",
  				"ec2:DescribeInternetGateways",
  				"ec2:DescribeIamInstanceProfileAssociations",
  				"ec2:DescribeInstanceStatus",
  				"ec2:DescribeImages",
  				"ec2:DescribeNetworkInterfaces",
  				"ec2:ModifyInstanceAttribute",
  				"ec2:AssociateIamInstanceProfile"
  			],
  			"Resource": "*"
  		},
  		{
  			"Sid": "IAMPermissions",
  			"Effect": "Allow",
  			"Action": [
  				"iam:CreateRole",
  				"iam:AttachRolePolicy",
  				"iam:CreateInstanceProfile",
  				"iam:AddRoleToInstanceProfile",
  				"iam:GetRole",
  				"iam:GetInstanceProfile",
  				"iam:PassRole"
  			],
  			"Resource": "*"
  		},
  		{
  			"Sid": "SSMPermissions",
  			"Effect": "Allow",
  			"Action": [
  				"ssm:SendCommand",
  				"ssm:GetParameter",
  				"ssm:DescribeInstanceInformation"
  			],
  			"Resource": "*"
  		},
  		{
  			"Sid": "CloudWatchLogsPermissions",
  			"Effect": "Allow",
  			"Action": [
  				"logs:CreateLogGroup",
  				"logs:CreateLogStream",
  				"logs:PutLogEvents"
  			],
  			"Resource": "*"
  		}
  	]
  } 

3. GO to Repository -> settings -> Secrets and Variables -> Actions 
  and add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY as secrets using the IAM user credentials

4. Make any changes to README.md or add a comment to any other file
5. Commit and Push  -> This will  trigger a github workflow that will run the required ec2 instance  
