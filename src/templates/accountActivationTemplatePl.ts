export const title = 'Weryfikacja email';

const accountActivationTemplate = (userName: string, code: string): string => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Weryfikacja Email</title>
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
            <h1>Weryfikacja Email</h1>
        </div>
        <div class="content">
            <p>Cześć ${userName}</p>
            <p>Dziękujemy za rejestrację. Aby dokończyć rejestrację, użyj poniższego kodu weryfikacyjnego:</p>
            <div class="code">${code}</div>
            <p>Ten kod jest ważny przez następne 5 minut.</p>
            <p>Jeśli nie rejestrowałeś/aś się na to konto, zignoruj tę wiadomość.</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 S/ash. Wszelkie prawa zastrzeżone.</p>
        </div>
    </div>
</body>
</html>
`;

export default accountActivationTemplate;
