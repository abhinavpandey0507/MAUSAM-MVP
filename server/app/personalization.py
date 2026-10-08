"""PERSONALIZATION ENGINE
------------------------
Mirror port of the original Node recommendation engine so the outputs stay
identical. Any card id that the model does not fully know is still emitted with
reasons derived from the weather; nothing here is live data.
"""

import re
from datetime import datetime, timezone  # noqa: F401 (kept in engine output)

CARD_IDS = {
    "travel": "Travel Tips",
    "health": "Health & Wellness",
    "education": "Education",
    "agriculture": "Agriculture",
    "running": "Running",
    "construction": "Construction",
    "photography": "Photography",
    "skiing": "Skiing",
    "golf": "Golf",
    "cycling": "Cycling",
    "camping": "Camping",
    "travel": "Travel Tips",
    "energy": "Energy Consumption",
    "hiking": "Hiking",
    "driving": "Driving",
    "pets": "Pet Care",
    "home": "Home & Garden",
    "outdoors": "Outdoor Events",
    "commute": "Commute",
    "air_quality": "Air Quality",
    "fishing": "Fishing",
    "gardening": "Gardening",
    "shipping": "Logistics & Shipping",
    "kids": "Kids & Family",
    "umbrella": "Umbrella / Rain Plan",
    "mood": "Mood & Productivity",
}

ALL_CARDS = [
    "travel", "health", "education", "agriculture", "running", "construction",
    "photography", "skiing", "golf", "cycling", "camping", "energy", "hiking",
    "driving", "pets", "home", "outdoors", "commute", "air_quality", "fishing",
    "gardening", "shipping", "kids", "umbrella", "mood",
]

PERSONA_WEIGHTS = {
    "default": {"general": 1.0},
    "student": {"education": 1.4, "commute": 1.2, "mood": 1.1},
    "commuter": {"commute": 1.5, "umbrella": 1.2, "driving": 1.0},
    "farmer": {"agriculture": 1.6, "gardening": 1.2, "pets": 1.0, "mood": 0.9},
    "athlete": {"running": 1.6, "cycling": 1.4, "hiking": 1.2, "health": 1.2, "mood": 0.9},
    "foodie": {},
    "traveler": {"travel": 1.6, "photography": 1.3, "commute": 1.0},
    "professional": {"travel": 1.3, "commute": 1.1, "energy": 0.9},
    "outdoors": {"camping": 1.5, "hiking": 1.4, "fishing": 1.2, "photography": 1.1},
    "senior": {"health": 1.4, "home": 1.1, "mood": 1.0},
    "busy_parent": {"kids": 1.5, "home": 1.2, "commute": 1.1, "umbrella": 1.0},
}

REQUIREMENT_BOOSTS = {
    "commute": ["commute", "driving", "umbrella"],
    "health": ["health", "air_quality", "running", "mood"],
    "agriculture": ["agriculture", "gardening"],
    "travel": ["travel", "photography", "commute"],
    "education": ["education", "commute", "mood"],
    "business": ["travel", "commute", "energy"],
    "daily": ["commute", "umbrella", "mood", "health"],
}

PERSONAS = {
    "default": "Generalist",
    "student": "Student",
    "commuter": "Daily Commuter",
    "farmer": "Farm Owner",
    "athlete": "Runner / Athlete",
    "foodie": "Foodie",
    "traveler": "Frequent Traveller",
    "professional": "Working Professional",
    "outdoors": "Outdoor Enthusiast",
    "senior": "Senior Citizen",
    "busy_parent": "Busy Parent",
}

SEVERITY_RANK = {"no_warning": 0, "watch": 1, "alert": 2, "warning": 3}


def _t(value):
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return value
    try:
        return float(str(value))
    except (TypeError, ValueError):
        return None


def top_warning(warnings):
    if not warnings:
        return None
    worst = None
    worst_rank = -1
    for w in warnings:
        sev = str(w.get("severity", "no_warning"))
        rank = SEVERITY_RANK.get(sev, 0)
        if rank > worst_rank:
            worst = w
            worst_rank = rank
    return worst


def score_order(weather):
    base = 1.0
    tw = top_warning(weather.get("warnings", []))
    if tw:
        base += SEVERITY_RANK.get(tw.get("severity"), 0) * 0.35
    rain = _t(weather.get("rainfall"))
    if rain and rain > 4:
        base += 0.8
    t = _t(weather.get("temperature"))
    if t is not None and t > 38:
        base += 0.7
    elif t is not None and t < 5:
        base += 0.6
    return round(base, 2)


def why_factors(card, weather):
    reasons = []
    t = _t(weather.get("temperature"))
    rain = _t(weather.get("rainfall"))
    cond = str(weather.get("weatherCondition") or "")
    tw = top_warning(weather.get("warnings", []))
    humid = _t(weather.get("humidity"))

    if card in ("health", "air_quality"):
        if rain and rain > 4:
            reasons.append("precipitation increases exposure risk")
        if t and t > 35:
            reasons.append("high heat may stress the body")
        if t and t < 8:
            reasons.append("cold temperatures can affect immunity")
        if humid and humid > 75:
            reasons.append("high humidity compounds discomfort")
    if card in ("running", "hiking", "cycling", "camping", "golf", "outdoors", "photography"):
        if rain and rain > 4:
            reasons.append("wet conditions may disrupt plans")
        if t and t > 36:
            reasons.append("extreme heat reduces comfort")
        if t and t < 5:
            reasons.append("cold can be a concern")
        if tw:
            reasons.append(f"a {tw.get('severity')} advisory is active")
        if not reasons:
            reasons.append("conditions are generally favourable")
    if card in ("driving", "commute", "travel", "shipping"):
        if rain and rain > 4:
            reasons.append("rain may slow travel / transit")
        if t and t > 38:
            reasons.append("hot spells affect comfort on the move")
        if tw:
            reasons.append("adverse weather advisories apply")
        if not reasons:
            reasons.append("regular conditions expected")
    if card in ("agriculture", "gardening", "umbrella"):
        if rain and rain > 4:
            reasons.append("soil moisture and runoff are affected")
        if rain and rain <= 4 and t and t > 34:
            reasons.append("heat may stress crops / plants")
        if tw:
            reasons.append("an active advisory may matter for planning")
        if not reasons:
            reasons.append("settled weather supports routine work")
    if card in ("energy", "home", "mood", "kids"):
        if t and t > 36:
            reasons.append("cooling demand will be higher")
        if t and t < 9:
            reasons.append("heating / indoor comfort is relevant")
        if cond:
            reasons.append(f"the forecast ({cond}) shapes day-to-day plans")
        if not reasons:
            reasons.append("weather is fairly neutral today")
    return reasons


def insights_for(card, weather):
    t = _t(weather.get("temperature"))
    rain = _t(weather.get("rainfall"))
    humid = _t(weather.get("humidity"))
    wind = _t(weather.get("windSpeed"))
    tw = top_warning(weather.get("warnings", []))
    insights = []
    if tw:
        insights.append(f"Active {tw.get('severity')} advisory for the area — stay updated.")
    if rain is not None and rain > 4:
        insights.append("Rainfall is expected; plan outdoor tasks around the showers.")
    if t is not None and t > 36:
        insights.append("Temperatures are high; schedule heavy work for cooler hours.")
    if t is not None and t < 8:
        insights.append("Cold conditions reported; dress warmly and protect plants/pipes.")
    if humid is not None and humid > 75:
        insights.append("Humidity is elevated; ventilation and hydration matter.")
    if wind is not None and wind > 24:
        insights.append("Breezy conditions; secure loose outdoor items.")
    if not insights:
        insights.append("Mild, stable weather — no special precautions needed.")
    return insights[:3]


def _sat(score):
    if score <= 35:
        return "low"
    if score <= 60:
        return "moderate"
    return "high"


def _score_base(card, weather, persona):
    tw = top_warning(weather.get("warnings", []))
    base = 12.0
    base += SEVERITY_RANK.get(tw.get("severity") if tw else "no_warning", 0) * 7
    rain = _t(weather.get("rainfall"))
    if card in ("umbrella",):
        if rain is not None and rain > 6:
            base += 42
        elif rain is not None and rain > 2:
            base += 16
    if card in ("travel", "commute", "driving", "outdoors", "photography", "golf", "hiking", "camping", "running", "cycling"):
        if rain is not None and rain > 4:
            if card in ("umbrella",):
                base += 8
            base -= 4 if card != "umbrella" else 0
        if card != "umbrella":
            t = _t(weather.get("temperature"))
            if t is not None and t > 38:
                base -= 6
            if t is not None and t < 4:
                base -= 5
    if card in ("agriculture", "gardening"):
        if rain is not None and rain > 4:
            base -= 2 if card != "umbrella" else 0
        t = _t(weather.get("temperature"))
        if t is not None and t > 38:
            base -= 6
    if card in ("health", "air_quality"):
        humid = _t(weather.get("humidity"))
        if humid is not None and humid > 80:
            base += 6
        if rain is not None and rain > 4:
            base += 5
    if card in ("energy", "home"):
        t = _t(weather.get("temperature"))
        if t is not None and t > 36:
            base += 9
        elif t is not None and t < 9:
            base += 7
    if card in ("mood", "kids"):
        t = _t(weather.get("temperature"))
        if t is not None and (t > 36 or t < 8):
            base += 6
    return base


def generic_tip(card, weather, persona):
    base_tips = {
        "travel": "Keep an eye on local advisories and allow extra time before stepping out.",
        "health": "Hydrate well; adjust layers according to the reported conditions.",
        "education": "Study indoors during the hottest hours and keep a water bottle handy.",
        "agriculture": "Check soil moisture; schedule irrigation taking rainfall into account.",
        "running": "Run in cooler early hours and warm up carefully.",
        "construction": "Secure materials against wind and avoid peak-heat hours for outdoor labour.",
        "photography": "Soft morning / evening light works best; protect gear from moisture.",
        "skiing": "Verify snow conditions and carry appropriate gear.",
        "golf": "Early tee times usually mean calmer, cooler conditions.",
        "cycling": "Take it easy into headwinds and keep hydration on board.",
        "camping": "Pick sheltered spots and check forecasts before pitching.",
        "energy": "Pre-cool or pre-heat smartly; use appliances sparingly at peak times.",
        "hiking": "Start early, carry water, and turn back if the weather turns.",
        "driving": "Reduce speed on wet roads and keep a safe following distance.",
        "pets": "Respect heat stroke risk for pets; walk them in cooler periods.",
        "home": "Ventilate well and manage indoor temperature based on the forecast.",
        "outdoors": "Have a plan B in case rain or heat interrupts the plan.",
        "commute": "Leave a little earlier and check alerts before heading out.",
        "air_quality": "Mask up if air quality worsens; keep windows closed on smoggy days.",
        "fishing": "Overcast, calm stretches often fish better; stay safe near water.",
        "gardening": "Water in the early morning or evening to reduce evaporation.",
        "shipping": "Expect possible delays in wet conditions and pack accordingly.",
        "kids": "Dress kids in layers and factor in playtime weather windows.",
        "umbrella": "Carry an umbrella — precipitation is on the cards.",
        "mood": "Spend time near a window and plan short outdoor breaks if possible.",
    }
    label = (
        CARD_IDS.get(card, card.replace("_", " ").title())
        if card in CARD_IDS
        else card.replace("_", " ").title()
    )
    return {"tip": base_tips.get(card, "Follow official advisories for the latest updates."), "label": label}


def build_recommendation(card, weather, persona, requirements=None):
    requirements = requirements or []
    matcher = "|".join(re.escape(x.strip()) for x in requirements if x.strip())
    if not matcher:
        score = _score_base(card, weather, persona)
    else:
        kws = requirement_kws(requirements)
        if card in kws:
            score = _score_base(card, weather, persona) + 18
        else:
            score = _score_base(card, weather, persona)
    wt = PERSONA_WEIGHTS.get(persona, PERSONA_WEIGHTS["default"])
    if card in wt:
        score += wt[card]

    reasons = why_factors(card, weather)
    rec = generic_tip(card, weather, persona)
    if requirements:
        reasons.append("matches the specific requirements you selected")

    return {
        "cardId": card,
        "label": rec["label"],
        "score": max(0, min(100, round(score))),
        "relevance": _sat(round(score)),
        "reasons": reasons[:3],
        "tip": rec["tip"],
        "insights": insights_for(card, weather),
    }


def requirement_kws(requirements):
    kws = set()
    text = " ".join(requirements).lower()
    for key, cards in REQUIREMENT_BOOSTS.items():
        for token in key.split("_"):
            if token and re.search(re.escape(token), text):
                kws.update(cards)
    for card in ALL_CARDS:
        plain = card.replace("_", " ")
        if re.search(re.escape(plain), text):
            kws.add(card)
    return kws


def personalize(location_id, weather, persona, requirements=None, cfg_options=None):
    options = cfg_options or {}
    reqs = requirements or options.get("requirements") or []
    persona = persona or options.get("persona") or "default"

    # Descope unrelated personas gracefully.
    card_pool = list(ALL_CARDS)
    if persona in PERSONA_WEIGHTS:
        weighted = PERSONA_WEIGHTS[persona]
        prio = [c for c in card_pool if c in weighted]
        other = [c for c in card_pool if c not in weighted]
        card_pool = prio + other

    # Strong diagnostic signal: umbrella surfaces immediately when an advisory is live.
    tw = top_warning(weather.get("warnings", []))
    if tw and "umbrella" in card_pool:
        card_pool.insert(0, card_pool.pop(card_pool.index("umbrella")))

    results = []
    seen = set()
    for card in card_pool:
        if card in seen:
            continue
        seen.add(card)
        if len(results) >= 12:
            break
        results.append(build_recommendation(card, weather, persona, reqs))

    results.sort(key=lambda r: r["score"], reverse=True)
    top = results[0] if results else None
    summary = build_summary(top, weather, persona)
    if not summary and top:
        summary = top["tip"]

    return {
        "ok": True,
        "result": {
            "persona": persona,
            "topCardId": top["cardId"] if top else None,
            "topCardLabel": top["label"] if top else None,
            "topCardReason": ", ".join(top["reasons"][:2]) if top and top["reasons"] else "general guidelines",
            "topTip": top["tip"] if top else "Check the local forecast before planning.",
            "recommendations": results,
            "summary": summary,
        },
        "dataSource": "personalization-engine",
    }


def build_summary(top, weather, persona):
    if not top:
        return None
    persona_label = PERSONAS.get(persona, "Generalist")
    hour = datetime.now(timezone.utc).hour
    part = "morning" if hour < 12 else ("afternoon" if hour < 17 else "evening")
    return f"For the {persona_label.lower()} profile ({part} plan): {top['label']} leads with a {top['relevance']} relevance — {top['tip']}"