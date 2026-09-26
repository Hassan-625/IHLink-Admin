interface ExperiencePhotoProps {
  src: string;
  alt: string;
  eyebrow: string;
  title: string;
  text: string;
  accentClass?: string;
}

export function ExperiencePhoto({ src, alt, eyebrow, title, text, accentClass = 'text-royal-600' }: ExperiencePhotoProps) {
  return (
    <section className="bg-white py-14">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 grid lg:grid-cols-[1.15fr_.85fr] gap-8 items-center">
        <div className="relative overflow-hidden rounded-3xl min-h-[300px] shadow-float">
          <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
          <span className="absolute bottom-5 left-5 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-slate-900 shadow-soft">Real people. Practical technology.</span>
        </div>
        <div>
          <p className={`text-sm font-extrabold uppercase tracking-[.16em] ${accentClass}`}>{eyebrow}</p>
          <h2 className="mt-3 text-3xl lg:text-4xl font-black text-ink leading-tight">{title}</h2>
          <p className="mt-4 text-base leading-7 text-muted">{text}</p>
        </div>
      </div>
    </section>
  );
}
