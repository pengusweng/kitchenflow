// A brand's name after a dot in its accent colour, as brands read in tables.
export default function BrandLabel({ brand }: { brand: { name: string; accent: string } }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: brand.accent }} />
      {brand.name}
    </span>
  );
}
