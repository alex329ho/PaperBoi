import argparse
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

TARGET_CONTENT_WORDS = 500

FILLER_BY_LANGUAGE: dict[str, list[str]] = {
    "en": [
        "Analysts in {region} said the {topic} outlook now hinges on execution rather than novelty.",
        "Several executives noted that budgets are being trimmed, so pilots must show payback within months.",
        "Frontline teams asked for clearer guidance on accountability, especially when automation touches customers.",
        "Regulators are also watching, and companies are preparing documentation before scaling deployments.",
        "Investors said the next earnings calls will focus on operational proof points and churn metrics.",
        "Industry groups are drafting playbooks that highlight vendor risk, contract flexibility, and exit plans.",
        "In procurement discussions, buyers are prioritizing interoperability with existing systems.",
        "Smaller firms reported that shared services and regional partners are filling gaps in expertise.",
        "There is also a push for training programs that translate strategy into day to day workflows.",
        "Many organizations are experimenting with staged rollouts to manage change management fatigue.",
        "People close to the projects said leadership wants steady improvements instead of headline grabbing launches.",
        "The next quarter will likely bring more benchmarking, with teams comparing performance across sites.",
    ],
    "es": [
        "Analistas en {region} dicen que el enfoque en {topic} ahora exige resultados medibles.",
        "Varias empresas piden metas claras antes de ampliar la inversion en nuevas plataformas.",
        "Los equipos operativos buscan guias practicas para evitar errores en la atencion al cliente.",
        "Los reguladores siguen el tema y recomiendan documentar cada paso del despliegue.",
        "En las reuniones con inversionistas se pide evidencia sobre ahorro de costos y eficiencia.",
        "Los proveedores compiten por integraciones simples con sistemas ya existentes.",
        "Empresas pequenas dependen de socios regionales para cubrir habilidades tecnicas.",
        "Se expanden talleres internos para traducir la estrategia en tareas diarias.",
        "Muchos directivos prueban lanzamientos por fases para reducir el riesgo.",
        "La presion se mantiene para mostrar beneficios sin perder confianza del publico.",
        "El proximo trimestre servira para comparar resultados entre ciudades y unidades.",
        "Los lideres quieren mejoras constantes en lugar de anuncios espectaculares.",
    ],
    "fr": [
        "Des analystes en {region} expliquent que le dossier {topic} passe de la vision au resultat.",
        "Les directions financieres demandent des preuves rapides avant d'etendre les budgets.",
        "Les equipes terrain souhaitent des regles simples pour proteger la relation client.",
        "Les autorites suivent le sujet et exigent une trace claire des decisions.",
        "Les investisseurs cherchent des gains de productivite mesurables sur les prochains trimestres.",
        "Les acheteurs privilegient des outils compatibles avec les systemes existants.",
        "Les PME comptent sur des partenaires locaux pour completer l'expertise.",
        "Des formations internes se multiplient afin de rendre les usages plus concrets.",
        "Plusieurs groupes testent des deploiements progressifs pour limiter les ruptures.",
        "La communication vise la transparence pour maintenir la confiance.",
        "Les comparaisons entre sites devraient guider les prochaines optimisations.",
        "Les responsables veulent une trajectoire stable plutot que des coups mediatiques.",
    ],
}


def _word_count(text: str) -> int:
    return len(text.split())


def expand_content(content: str, *, topic: str, region: str, language: str) -> str:
    """Pad article content to roughly TARGET_CONTENT_WORDS using neutral filler."""
    current_words = _word_count(content)
    if current_words >= TARGET_CONTENT_WORDS:
        return content

    filler = FILLER_BY_LANGUAGE.get(language, FILLER_BY_LANGUAGE["en"])
    extra_paragraphs: list[str] = []
    sentence_index = 0
    topic_label = topic.lower()
    while current_words < TARGET_CONTENT_WORDS:
        sentences: list[str] = []
        for _ in range(4):
            sentence = filler[sentence_index % len(filler)].format(
                topic=topic_label,
                region=region,
            )
            sentences.append(sentence)
            sentence_index += 1
        paragraph = " ".join(sentences)
        extra_paragraphs.append(paragraph)
        current_words += _word_count(paragraph)

    return f"{content}\n\n" + "\n\n".join(extra_paragraphs)


def resolve_sqlite_path() -> Path:
    db_url = os.getenv("PAPERBOI_DATABASE_URL", "sqlite+aiosqlite:///./paperboi.db")
    if db_url.startswith("sqlite+aiosqlite:///"):
        return Path(db_url.replace("sqlite+aiosqlite:///", ""))
    if db_url.startswith("sqlite:///"):
        return Path(db_url.replace("sqlite:///", ""))
    return Path("paperboi.db")


def build_seed_articles(count: int) -> list[dict]:
    now = datetime.now(timezone.utc)
    templates = [
        {
            "topic": "Technology",
            "region": "US",
            "language": "en",
            "title": "Hiring managers reset AI expectations after a year of pilots",
            "url_slug": "ai-hiring-expectations-reset",
            "domain": "techline.example",
            "source": "Techline Daily",
            "tone": "cautiously optimistic",
            "content": (
                "A new survey of mid-sized employers shows a shift from AI hype to targeted use cases. "
                "Teams that ran pilots last year report the biggest gains in customer support triage "
                "and internal search, while ambitious automation projects are being paused."
                "\n\n"
                "Recruiters say job listings are still adding AI-related skills, but the emphasis has moved "
                "to process ownership and evaluation. One hiring director called 2024 \"the year of the "
                "spreadsheet,\" with more time spent measuring impact than buying new tools."
            ),
        },
        {
            "topic": "Business",
            "region": "Europe",
            "language": "en",
            "title": "Retailers brace for a short holiday season as shipping costs fall",
            "url_slug": "retailers-short-holiday-season",
            "domain": "marketwatcher.example",
            "source": "Market Watcher",
            "tone": "neutral",
            "content": (
                "European retailers are reporting tighter lead times for the upcoming holiday period. "
                "Lower container rates are helping margins, but merchants warn that late demand could "
                "force steeper markdowns in January."
                "\n\n"
                "Several chains said they are holding leaner inventories and relying on regional suppliers. "
                "Analysts expect promotions to start earlier, with a stronger focus on private-label goods "
                "to offset labor costs."
            ),
        },
        {
            "topic": "Science",
            "region": "Asia",
            "language": "en",
            "title": "Ocean heat study links stronger typhoons to a narrow current band",
            "url_slug": "ocean-heat-typhoon-current-band",
            "domain": "scienceledger.example",
            "source": "Science Ledger",
            "tone": "informative",
            "content": (
                "Researchers analyzing 30 years of satellite data say a narrow band of warm current "
                "in the western Pacific is correlating with more rapid typhoon intensification. "
                "The finding could improve short-term forecasts for coastal regions."
                "\n\n"
                "The team notes that the signal is strongest during late summer, when the current shifts "
                "closer to the Philippines and southern Japan. They plan to combine the model with "
                "floating buoy observations next season."
            ),
        },
        {
            "topic": "Health",
            "region": "Global",
            "language": "en",
            "title": "Primary care groups adopt shorter visits with longer follow ups",
            "url_slug": "primary-care-shorter-visits",
            "domain": "healthbrief.example",
            "source": "Health Brief",
            "tone": "pragmatic",
            "content": (
                "Clinics are redesigning appointment schedules to reduce wait times while extending follow-up "
                "check-ins through secure messaging. Administrators say the approach increases capacity "
                "without reducing overall clinician contact."
                "\n\n"
                "Patients with chronic conditions are offered quick in-person visits paired with virtual "
                "check-ins. The model is drawing interest from insurers, who see potential savings when "
                "missed appointments decline."
            ),
        },
        {
            "topic": "Technology",
            "region": "US",
            "language": "es",
            "title": "Las empresas priorizan seguridad antes de nuevas herramientas de IA",
            "url_slug": "empresas-seguridad-ia",
            "domain": "noticiasdigitales.example",
            "source": "Noticias Digitales",
            "tone": "neutral",
            "content": (
                "Un informe de consultoria indica que las companias estan revisando sus politicas de datos "
                "antes de ampliar el uso de inteligencia artificial. Los equipos legales piden controles "
                "claros sobre proveedores y acceso a informacion sensible."
                "\n\n"
                "Aun asi, la inversion continua en areas como automatizacion de documentos y analisis de "
                "soporte al cliente. Varios directores senalan que el objetivo es ganar eficiencia sin "
                "sacrificar confianza."
            ),
        },
        {
            "topic": "Business",
            "region": "Europe",
            "language": "fr",
            "title": "Les banques regionales accelerent les prets aux PME",
            "url_slug": "banques-regionales-prets-pme",
            "domain": "financejourdain.example",
            "source": "Finance Jourdain",
            "tone": "optimistic",
            "content": (
                "Les banques regionales en France et en Allemagne augmentent leurs enveloppes de credit "
                "pour les petites entreprises. Les dirigeants citent une demande solide dans les secteurs "
                "du tourisme et de la fabrication locale."
                "\n\n"
                "Les analystes avertissent toutefois que les dossiers restent plus difficiles qu'avant, "
                "avec des exigences plus strictes sur la tresorerie. Les PME recherchent donc aussi des "
                "partenariats publics pour stabiliser leur croissance."
            ),
        },
        {
            "topic": "Science",
            "region": "Asia",
            "language": "en",
            "title": "New battery chemistry boosts range in humid climates",
            "url_slug": "battery-chemistry-humid-climates",
            "domain": "labjournal.example",
            "source": "Lab Journal",
            "tone": "promising",
            "content": (
                "A materials lab in Singapore announced a lithium-sulfur variant that retains capacity in "
                "high humidity. Early tests show a 12 percent improvement over conventional cells when "
                "exposed to tropical storage conditions."
                "\n\n"
                "The researchers are now focused on scaling the cathode coating process. Industry partners "
                "say the chemistry could be attractive for fleets in Southeast Asia and coastal China."
            ),
        },
        {
            "topic": "Health",
            "region": "Global",
            "language": "en",
            "title": "Hospitals expand quiet wards to address sleep recovery",
            "url_slug": "hospitals-quiet-wards",
            "domain": "clinicsource.example",
            "source": "Clinic Source",
            "tone": "supportive",
            "content": (
                "A growing number of hospitals are piloting quiet wards with dimmed lighting and reduced "
                "overnight paging. Clinicians say patients in recovery report better sleep and lower stress."
                "\n\n"
                "The initiative includes scheduled rounding windows and designated equipment zones to cut "
                "down on hallway noise. Administrators are tracking readmission rates to measure impact."
            ),
        },
        {
            "topic": "Technology",
            "region": "US",
            "language": "en",
            "title": "City transit agency tests contactless fare caps",
            "url_slug": "transit-contactless-fare-caps",
            "domain": "civicwire.example",
            "source": "Civic Wire",
            "tone": "neutral",
            "content": (
                "The Metro Authority is rolling out fare caps for riders using contactless payments. "
                "Once a rider hits a daily or weekly threshold, additional trips are free."
                "\n\n"
                "Officials say the system is meant to simplify fares for occasional riders and reduce the "
                "need to buy passes up front. A six-month pilot will compare ridership against last year."
            ),
        },
        {
            "topic": "Business",
            "region": "Europe",
            "language": "en",
            "title": "Airline alliances rethink lounge access rules",
            "url_slug": "airline-alliances-lounge-rules",
            "domain": "travelledger.example",
            "source": "Travel Ledger",
            "tone": "cautious",
            "content": (
                "Major airline alliances are revisiting lounge access policies as summer travel demand "
                "remains high. Several carriers plan to tie access more closely to ticket class rather "
                "than frequent-flyer status."
                "\n\n"
                "The changes are designed to manage crowding and improve service levels. Loyalty groups "
                "say they will monitor impacts on premium memberships in the coming quarters."
            ),
        },
        {
            "topic": "Science",
            "region": "Asia",
            "language": "en",
            "title": "Satellite crop maps reveal uneven recovery after drought",
            "url_slug": "satellite-crop-maps-drought-recovery",
            "domain": "earthdata.example",
            "source": "Earth Data Bulletin",
            "tone": "analytical",
            "content": (
                "New satellite imagery shows that rice yields in parts of northern Vietnam have rebounded "
                "faster than expected after last year's drought. Researchers attribute the recovery to "
                "improved irrigation timing and new drought-tolerant strains."
                "\n\n"
                "Other regions remain below average, particularly where reservoir levels stayed low into "
                "the spring. The report recommends targeted support for smaller farms this season."
            ),
        },
        {
            "topic": "Health",
            "region": "Global",
            "language": "en",
            "title": "Pharmacies pilot weekend vaccination windows",
            "url_slug": "pharmacies-weekend-vaccination-windows",
            "domain": "publichealthdesk.example",
            "source": "Public Health Desk",
            "tone": "encouraging",
            "content": (
                "Community pharmacies are testing expanded weekend hours for routine vaccinations. "
                "Early results show higher turnout among families and shift workers."
                "\n\n"
                "Public health officials say the model could reduce seasonal bottlenecks. The pilot will "
                "continue through the next flu season to determine staffing and cost requirements."
            ),
        },
    ]

    articles: list[dict] = []
    for idx in range(count):
        template = templates[idx % len(templates)]
        published_at = (now - timedelta(hours=idx * 6)).date()
        created_at = now - timedelta(hours=idx * 6)
        suffix = f"-{idx + 1}" if idx >= len(templates) else ""
        content = expand_content(
            template["content"],
            topic=template["topic"],
            region=template["region"],
            language=template["language"],
        )
        articles.append(
            {
                "title": template["title"],
                "url": f"https://{template['domain']}/{template['url_slug']}{suffix}",
                "domain": template["domain"],
                "source": template["source"],
                "published_date": published_at.isoformat(),
                "content": content,
                "tone": template["tone"],
                "location": template["region"],
                "language": template["language"],
                "created_at": created_at.isoformat(),
            }
        )
    return articles


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS news_articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            url TEXT NOT NULL UNIQUE,
            domain TEXT,
            source TEXT,
            published_date DATE,
            content TEXT,
            tone TEXT,
            location TEXT,
            language TEXT,
            created_at DATETIME NOT NULL
        )
        """
    )
    conn.commit()


def seed_articles(count: int, force: bool) -> None:
    db_path = resolve_sqlite_path()
    conn = sqlite3.connect(db_path)
    try:
        ensure_schema(conn)
        existing_count = conn.execute("SELECT COUNT(*) FROM news_articles").fetchone()[0]
        if existing_count and not force:
            print(f"Seed skipped: {existing_count} articles already present in {db_path}.")
            return

        articles = build_seed_articles(count)
        conn.executemany(
            """
            INSERT OR IGNORE INTO news_articles
                (title, url, domain, source, published_date, content, tone, location, language, created_at)
            VALUES
                (:title, :url, :domain, :source, :published_date, :content, :tone, :location, :language, :created_at)
            """,
            articles,
        )
        conn.commit()
        print(f"Seeded {len(articles)} articles into {db_path}.")
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the PaperBoi news_articles table.")
    parser.add_argument("--count", type=int, default=12, help="Number of articles to insert.")
    parser.add_argument("--force", action="store_true", help="Seed even if articles already exist.")
    args = parser.parse_args()
    seed_articles(args.count, args.force)


if __name__ == "__main__":
    main()
