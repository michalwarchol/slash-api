export const title = 'Password change in Slash service';

const passwordChangeTemplate = (userName: string, code: string): string => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Email Verification</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border: 1px solid #dddddd;
            padding: 20px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            padding: 10px 0;
        }
        .header h1 {
            margin: 0;
            color: #333333;
        }
        .content {
            padding: 20px;
            text-align: center;
        }
        .code {
            font-size: 24px;
            font-weight: bold;
            color: #333333;
            background-color: #f9f9f9;
            padding: 10px;
            border-radius: 5px;
            display: inline-block;
            margin-top: 20px;
        }
        .footer {
            text-align: center;
            padding: 10px;
            color: #999999;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password change</h1>
        </div>
        <div class="content">
            <p>Hello ${userName}</p>
            <p>To finish your password change, use code below:</p>
            <div class="code">${code}</div>
            <p>This code is valid for the next 5 minutes.</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} S/ash. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

export default passwordChangeTemplate;
