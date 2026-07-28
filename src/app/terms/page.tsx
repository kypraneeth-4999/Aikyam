export const metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 sm:px-6 py-12">
      <h1 className="font-display text-3xl text-cream">Terms of Use</h1>
      <p className="mt-2 text-xs text-muted">
        Draft — pending review by legal counsel before public launch.
      </p>

      <div className="mt-8 space-y-6 text-sm leading-6 text-muted">
        <section>
          <h2 className="mb-2 font-semibold text-cream">1. What Aikyam is</h2>
          <p>
            Aikyam is a platform that lets organisers list cultural events and lets
            attendees discover and book them. Aikyam is not the organiser of the
            events listed; each event is run by the organiser shown on its page.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-cream">2. Accounts</h2>
          <p>
            You are responsible for the accuracy of the information on your account
            and for activity that happens under it. One account per person.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-cream">3. Bookings and payments</h2>
          <p>
            Payments are processed by Razorpay; Aikyam does not store your card
            details. A booking is confirmed only once payment is verified. Aikyam
            charges organisers a platform fee, deducted from their payout.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-cream">4. Cancellations and refunds</h2>
          <p>
            If an organiser cancels an event, paid bookings are refunded. Each event
            may also state its own cancellation policy, shown on the event page. For
            any other refund request, contact the organiser.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-cream">5. Organiser responsibilities</h2>
          <p>
            Organisers are responsible for delivering the event as described, for
            the safety and legality of what they run, and for any permissions or
            licences required. Listings must be accurate and must not be misleading.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-cream">6. Acceptable use</h2>
          <p>
            Do not post unlawful, hateful, or deceptive content; do not impersonate
            others; do not attempt to disrupt or gain unauthorised access to the
            service. We may remove content or suspend accounts that breach this.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-cream">7. Changes</h2>
          <p>
            We may update these terms as the service develops. Continued use after a
            change means you accept the updated terms.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-cream">8. Contact</h2>
          <p>
            Questions about these terms:{" "}
            <a href="mailto:support@aikyam.app" className="text-gold hover:text-saffron">
              support@aikyam.app
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
