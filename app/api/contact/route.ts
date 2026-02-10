import { NextRequest, NextResponse } from 'next/server'
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// Initialize SES Client with specific SES credentials only
const sesClient = new SESClient({
  region: process.env.AWS_REGION || "us-east-2",
  credentials: {
    accessKeyId: process.env.SES_AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.SES_AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    // Validate input
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const senderEmail = process.env.SES_SENDER_EMAIL;
    const recipientEmail = process.env.SES_RECIPIENT_EMAIL;

    if (!senderEmail || !recipientEmail) {
      console.error("SES environment variables missing");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const command = new SendEmailCommand({
      Source: senderEmail,
      Destination: {
        ToAddresses: [recipientEmail],
      },
      Message: {
        Subject: {
          Data: `New Portfolio Contact: ${name}`,
          Charset: "UTF-8",
        },
        Body: {
          Text: {
            Data: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
            Charset: "UTF-8",
          },
          Html: {
            Data: `
              <h2>New Contact Form Submission</h2>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Message:</strong></p>
              <p>${message.replace(/\n/g, "<br>")}</p>
            `,
            Charset: "UTF-8",
          },
        },
      },
      ReplyToAddresses: [email],
    });

    await sesClient.send(command);

    return NextResponse.json(
      { message: "Message sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}