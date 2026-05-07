"use client";

import { useBreakpoint } from "@/lib/wazelo";
import SiteFooter from "@/components/Footer";
import SiteNavbar from "@/components/Navbar";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 16, letterSpacing: "-0.02em" }}>{title}</h2>
      {children}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 15, color: "rgba(219,194,176,0.65)", lineHeight: 1.85, fontFamily: "'Inter', sans-serif", marginBottom: 14 }}>{children}</p>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ fontSize: 15, color: "rgba(219,194,176,0.65)", lineHeight: 1.85, fontFamily: "'Inter', sans-serif", marginBottom: 8, paddingLeft: 4 }}>{children}</li>
  );
}

// ─── Terms Page ──────────────────────────────────────────────────────────────
export default function TermsPage() {
  const { mobile } = useBreakpoint();

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      <SiteNavbar />

      <main style={{ background: "var(--bg)", paddingTop: 96 }}>
        {/* Hero */}
        <div style={{ background: "#131313", borderBottom: "1px solid rgba(255,183,125,0.06)", padding: mobile ? "48px 20px" : "64px 48px" }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px",
              borderRadius: 100, background: "rgba(255,183,125,0.08)", border: "1px solid rgba(255,183,125,0.2)",
              marginBottom: 20,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffb77d", display: "inline-block" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#ffb77d", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Inter', sans-serif" }}>Legal</span>
            </div>
            <h1 style={{ fontSize: mobile ? "clamp(28px,7vw,44px)" : "clamp(32px,3.5vw,52px)", fontWeight: 900, letterSpacing: "-0.04em", color: "#fff", fontFamily: "'Inter', sans-serif", marginBottom: 16 }}>
              Terms of Service
            </h1>
            <p style={{ fontSize: 14, color: "rgba(219,194,176,0.45)", fontFamily: "'Inter', sans-serif" }}>
              Last updated: April 19, 2025 · Effective for all Wazelo CRM users
            </p>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 800, margin: "0 auto", padding: mobile ? "56px 20px 80px" : "72px 48px 100px" }}>

          <Section title="1. Acceptance of Terms">
            <P>By accessing or using Wazelo CRM ("Service"), operated by Wazelo CRM ("we", "us", or "our"), you agree to be bound by these Terms of Service ("Terms"). If you are using the Service on behalf of a business or organisation, you represent that you have the authority to bind that entity to these Terms.</P>
            <P>If you do not agree to these Terms, do not use the Service.</P>
          </Section>

          <Section title="2. Description of Service">
            <P>Wazelo CRM provides a WhatsApp Business API-based customer relationship management platform including a shared inbox, contact management, bulk campaign broadcasting, automation workflows, chatbot builder, and analytics dashboard. The Service is accessed via wazelo.in and its subdomains.</P>
            <P>We reserve the right to modify, suspend, or discontinue any part of the Service at any time with reasonable notice to active subscribers.</P>
          </Section>

          <Section title="3. Account Registration">
            <P>To use the Service, you must create an account with accurate information. You are responsible for:</P>
            <ul style={{ paddingLeft: 20, marginBottom: 14 }}>
              <Li>Maintaining the confidentiality of your account credentials</Li>
              <Li>All activity that occurs under your account</Li>
              <Li>Notifying us immediately of any unauthorised access at <a href="mailto:support@wazelo.in" style={{ color: "#ffb77d", textDecoration: "none" }}>support@wazelo.in</a></Li>
            </ul>
            <P>One account may not be shared across multiple organisations. Each organisation must maintain its own account.</P>
          </Section>

          <Section title="4. Acceptable Use">
            <P>You agree to use the Service only for lawful purposes and in accordance with Meta's WhatsApp Business Policy. You must not:</P>
            <ul style={{ paddingLeft: 20, marginBottom: 14 }}>
              <Li>Send unsolicited bulk messages (spam) to contacts who have not opted in</Li>
              <Li>Use the platform to harass, threaten, or deceive any person</Li>
              <Li>Transmit malware, viruses, or any harmful code</Li>
              <Li>Attempt to gain unauthorised access to any part of the Service or its infrastructure</Li>
              <Li>Resell, sublicense, or white-label the Service without a written agreement with us</Li>
              <Li>Use the Service in any way that violates applicable Indian or international laws</Li>
            </ul>
            <P>We reserve the right to suspend or terminate any account found to be in violation of these terms without prior notice.</P>
          </Section>

          <Section title="5. WhatsApp Business API Compliance">
            <P>You acknowledge that the Service is built on Meta's WhatsApp Business API and that your use must comply with Meta's Business Policy, Commerce Policy, and WhatsApp's terms at all times. You are solely responsible for:</P>
            <ul style={{ paddingLeft: 20, marginBottom: 14 }}>
              <Li>Obtaining proper opt-in consent from all contacts before messaging them</Li>
              <Li>Ensuring your message templates comply with Meta's template guidelines</Li>
              <Li>Any penalties, restrictions, or bans imposed by Meta on your WhatsApp Business Account</Li>
            </ul>
          </Section>

          <Section title="6. Subscription & Billing">
            <P>Wazelo CRM is offered on a subscription basis. By subscribing to a paid plan, you authorise us to charge the applicable fees to your chosen payment method at the start of each billing cycle.</P>
            <ul style={{ paddingLeft: 20, marginBottom: 14 }}>
              <Li>All prices are in Indian Rupees (INR) unless stated otherwise</Li>
              <Li>Subscription fees are non-refundable except as required by law or as stated in our Refund Policy</Li>
              <Li>We may change subscription prices with 30 days' written notice to active subscribers</Li>
              <Li>Failure to pay may result in suspension of your account after a 7-day grace period</Li>
            </ul>
          </Section>

          <Section title="7. Free Trial">
            <P>We may offer a free trial period. At the end of the trial, your account will be converted to a paid subscription unless you cancel before the trial expires. No credit card is required during the trial unless explicitly stated.</P>
          </Section>

          <Section title="8. Intellectual Property">
            <P>All content, features, and functionality of the Service — including but not limited to software, text, graphics, logos, and user interfaces — are owned by Wazelo CRM and protected by intellectual property laws.</P>
            <P>You retain all rights to the data and content you upload to the Service. By using the Service, you grant us a limited licence to process your data solely for the purpose of providing the Service.</P>
          </Section>

          <Section title="9. Data & Privacy">
            <P>Your use of the Service is also governed by our <a href="/privacy" style={{ color: "#ffb77d", textDecoration: "none" }}>Privacy Policy</a>, which is incorporated into these Terms by reference. By using the Service, you consent to the practices described therein.</P>
          </Section>

          <Section title="10. Limitation of Liability">
            <P>To the maximum extent permitted by applicable law, Wazelo CRM shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Service, including but not limited to loss of revenue, data, goodwill, or business opportunities.</P>
            <P>Our total cumulative liability to you for any claims arising under these Terms shall not exceed the amount you paid us in the 3 months preceding the claim.</P>
          </Section>

          <Section title="11. Indemnification">
            <P>You agree to indemnify, defend, and hold harmless Wazelo CRM and its officers, directors, employees, and agents from any claims, liabilities, damages, and expenses (including legal fees) arising from your use of the Service, your violation of these Terms, or your violation of any third-party rights.</P>
          </Section>

          <Section title="12. Termination">
            <P>You may cancel your account at any time from your billing settings. We may suspend or terminate your access immediately if you violate these Terms or if we are required to do so by law.</P>
            <P>Upon termination, your right to use the Service ceases immediately. We will retain your data for 30 days after termination to allow for any disputes, after which it will be permanently deleted.</P>
          </Section>

          <Section title="13. Governing Law">
            <P>These Terms are governed by and construed in accordance with the laws of India. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts in Bengaluru, Karnataka, India.</P>
          </Section>

          <Section title="14. Changes to Terms">
            <P>We may update these Terms from time to time. We will notify you of material changes by email or via an in-app notice at least 14 days before the changes take effect. Continued use of the Service after the effective date constitutes your acceptance of the updated Terms.</P>
          </Section>

          <Section title="15. Contact Us">
            <P>For questions about these Terms, contact us at:</P>
            <div style={{ background: "#1c1b1b", border: "1px solid rgba(255,183,125,0.1)", borderRadius: 10, padding: "20px 24px" }}>
              <p style={{ fontSize: 14, color: "#e5e2e1", fontFamily: "'Inter', sans-serif", marginBottom: 4, fontWeight: 600 }}>Wazelo CRM</p>
              <p style={{ fontSize: 14, color: "rgba(219,194,176,0.6)", fontFamily: "'Inter', sans-serif", marginBottom: 4 }}>Email: <a href="mailto:legal@wazelo.in" style={{ color: "#ffb77d", textDecoration: "none" }}>legal@wazelo.in</a></p>
              <p style={{ fontSize: 14, color: "rgba(219,194,176,0.6)", fontFamily: "'Inter', sans-serif" }}>Website: <a href="https://wazelo.in" style={{ color: "#ffb77d", textDecoration: "none" }}>wazelo.in</a></p>
            </div>
          </Section>

        </div>
      </main>

      <SiteFooter />
    </>
  );
}
