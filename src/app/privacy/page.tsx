export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 sm:px-6 py-12">
      <h1 className="font-display text-3xl text-cream">Privacy Policy</h1>
      <p className="mt-2 text-xs text-muted">
        Draft — pending review by legal counsel before public launch.
      </p>

      <div className="mt-8 space-y-6 text-sm leading-6 text-muted">
        <section>
          <h2 className="mb-2 font-semibold text-cream">What we collect</h2>
          <ul className="list-inside list-disc space-y-1">
            <li>Your name, and the email address or phone number you sign in with</li>
            <li>Your city, if you provide it</li>
            <li>Bookings you make, and the guest names you enter</li>
            <li>For organisers: your public profile — handle, bio, photo, links</li>
          </ul>
          <p className="mt-2">
            We do <strong>not</strong> store passwords (sign-in is via one-time code
            or Google) and we do <strong>not</strong> store card details (Razorpay
            handles payments; we keep only a payment reference and status).
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-cream">How we use it</h2>
          <p>
            To run your bookings — issuing tickets, sending confirmations and event
            reminders, enabling check-in at the door, and processing refunds. We
            share the attendee name and booking details with the organiser of the
            event you booked, so they can run it.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-cream">Who else sees your data</h2>
          <p>
            Service providers that make the platform work: Supabase (database and
            authentication), Vercel (hosting), Razorpay (payments), and Resend
            (email). We do not sell your data.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-cream">Your choices</h2>
          <p>
            You can edit your details, turn off event reminders, or delete your
            account from Settings. Deleting your account removes your personal
            details; past booking records are retained in anonymised form so
            organisers&apos; event history and financial records stay accurate.
            Essential messages — your ticket and cancellation notices — are always
            sent, as they are part of the booking itself.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-cream">Contact</h2>
          <p>
            Privacy questions or requests:{" "}
            <a href="mailto:support@aikyam.app" className="text-gold hover:text-saffron">
              support@aikyam.app
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
