import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Abid Air SignIn Dashboard"
        description="This is Admin SignIn Dashboard page for Abid Air"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
