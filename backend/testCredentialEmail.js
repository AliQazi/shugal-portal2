import dotenv from "dotenv";
import {
  sendCredentialsEmail,
  testEmailConfiguration,
} from "./utils/emailService.js";

dotenv.config();

// Test sending credentials email
const testSendCredentials = async () => {
  try {
    console.log("🔧 Starting Email Configuration Test...\n");

    // Check environment variables
    console.log("📋 Environment Variables:");
    console.log(
      "  EMAIL_SERVICE:",
      process.env.EMAIL_SERVICE || "gmail (default)",
    );
    console.log("  EMAIL_USER:", process.env.EMAIL_USER || "❌ NOT SET");
    console.log(
      "  EMAIL_PASSWORD:",
      process.env.EMAIL_PASSWORD ? "✅ SET (hidden)" : "❌ NOT SET",
    );
    console.log(
      "  FRONTEND_URL:",
      process.env.FRONTEND_URL || "http://localhost:5173 (default)",
    );
    console.log("");

    // Validate configuration
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error(
        "❌ ERROR: EMAIL_USER and EMAIL_PASSWORD must be set in .env file",
      );
      console.error("");
      console.error("For Gmail:");
      console.error("1. Go to Google Account settings");
      console.error("2. Enable 2-Step Verification");
      console.error("3. Generate an App Password");
      console.error("4. Use that App Password (not your regular password)");
      process.exit(1);
    }

    // Test email configuration
    console.log("🔍 Testing email transporter...");
    const configTest = await testEmailConfiguration();
    if (!configTest.success) {
      console.error("❌ Email configuration test failed:", configTest.error);
      process.exit(1);
    }
    console.log("");

    // Send test credentials email
    console.log("📧 Sending test credentials email...");
    const result = await sendCredentialsEmail(
      process.env.EMAIL_USER, // Send to yourself for testing
      "TEST001",
      "TestPassword123!",
      "Test Agent",
      "Test Company Ltd.",
    );

    console.log("");
    console.log("✅ SUCCESS! Email sent successfully!");
    console.log("📬 Message ID:", result.messageId);
    console.log("📨 Email sent to:", process.env.EMAIL_USER);
    console.log("");
    console.log(
      "Please check your inbox (and spam folder) for the credentials email.",
    );

    process.exit(0);
  } catch (error) {
    console.error("");
    console.error("❌ FAILED! Error sending email:");
    console.error("Error message:", error.message);
    console.error("");

    if (error.code === "EAUTH") {
      console.error("Authentication failed. Common fixes:");
      console.error(
        "1. For Gmail: Use an App Password, not your regular password",
      );
      console.error('2. Enable "Less secure app access" (if not using 2FA)');
      console.error("3. Check that EMAIL_USER and EMAIL_PASSWORD are correct");
    } else if (error.code === "ECONNECTION") {
      console.error("Connection failed. Common fixes:");
      console.error("1. Check your internet connection");
      console.error("2. Verify SMTP host and port settings");
      console.error("3. Check firewall settings");
    }

    console.error("");
    console.error("Full error:", error);
    process.exit(1);
  }
};

testSendCredentials();
