import { testEmailConfiguration } from "./emailService.js";

// Test email configuration on server start
const testEmail = async () => {
  console.log("\n🔧 Testing email configuration...\n");
  
  const isValid = await testEmailConfiguration();
  
  if (isValid) {
    console.log("📧 Email service is ready to send password reset emails\n");
  } else {
    console.log("⚠️  Email service is not configured. Password resets will work in development mode only.");
    console.log("ℹ️  To enable email sending, please configure your .env file with email credentials.\n");
  }
};

export default testEmail;
