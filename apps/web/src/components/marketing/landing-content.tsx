export function LandingContent() {
  return (
    <section className="border-t border-[#2a2a2a] pt-12" id="credit-method">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-medium tracking-tight text-white md:text-3xl">
          Credit visibility for on-chain balance sheets.
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-[#888]">
          Five scoring dimensions, one lender-readable number. Wallet tenure, asset depth, position
          stability, repayment behavior, and multichain activity — normalized into a verifiable
          credential.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            className="rounded-md bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-[#e5e5e5]"
            href="#connect-credit-wallet"
          >
            Connect Wallet
          </a>
          <a
            className="rounded-md border border-[#333] px-5 py-2.5 text-sm text-white transition hover:bg-[#111]"
            href="#credit-method"
          >
            Learn More
          </a>
        </div>
      </div>
    </section>
  );
}
