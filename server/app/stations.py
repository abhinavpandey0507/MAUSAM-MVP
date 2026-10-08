"""Station mapping for the 7 supported MVP cities.
`station_id`  -> IMD station code used by current-wx APIs (Safdarjung = 42181 for Delhi).
`forecast_id` -> station code used by city forecast APIs.
`radar_code`  -> Doppler radar product code in official IMD radar animation loops.
`site_slug`   -> regional IMD website path used for homepage observation scraping.
`district`    -> district used for district nowcast & warnings lookups.
"""
_STATIONS = [
    {
        "id": "new-delhi",
        "name": "New Delhi",
        "station_id": "42181",
        "forecast_id": "42182",
        "radar_code": "DELHI",
        "site_slug": "newdelhi",
        "obs_name": "New Delhi-Safdarjung",
        "district": "NEW DELHI",
        "state": "Delhi",
        "lat": 28.6139,
        "lon": 77.209,
    },
    {
        "id": "chandigarh",
        "name": "Chandigarh",
        "station_id": "42057",
        "forecast_id": "42057",
        "radar_code": "DELHI",  # no local DWR - nearest network radar (Delhi) is referenced
        "site_slug": "chandigarh",
        "obs_name": "Chandigarh",
        "district": "CHANDIGARH",
        "state": "Chandigarh",
        "lat": 30.7333,
        "lon": 76.7794,
    },
    {
        "id": "mumbai",
        "name": "Mumbai",
        "station_id": "43057",
        "forecast_id": "43057",
        "radar_code": "MPT",
        "site_slug": "mumbai",
        "obs_name": "Mumbai (Colaba)",
        "district": "MUMBAI",
        "state": "Maharashtra",
        "lat": 19.076,
        "lon": 72.8777,
    },
    {
        "id": "bengaluru",
        "name": "Bengaluru",
        "station_id": "43295",
        "forecast_id": "43295",
        "radar_code": "MLR",
        "site_slug": "bengaluru",
        "obs_name": "Bengaluru",
        "district": "BENGALURU URBAN",
        "state": "Karnataka",
        "lat": 12.9716,
        "lon": 77.5946,
    },
    {
        "id": "chennai",
        "name": "Chennai",
        "station_id": "43244",
        "forecast_id": "43244",
        "radar_code": "CNI",
        "site_slug": "chennai",
        "obs_name": "Chennai (Nungambakkam)",
        "district": "CHENNAI",
        "state": "Tamil Nadu",
        "lat": 13.0827,
        "lon": 80.2707,
    },
    {
        "id": "kolkata",
        "name": "Kolkata",
        "station_id": "42809",
        "forecast_id": "42809",
        "radar_code": "KOL",
        "site_slug": "kolkata",
        "obs_name": "Kolkata (Alipore)",
        "district": "KOLKATA",
        "state": "West Bengal",
        "lat": 22.5726,
        "lon": 88.3639,
    },
    {
        "id": "hyderabad",
        "name": "Hyderabad",
        "station_id": "43128",
        "forecast_id": "43128",
        "radar_code": "HYD",
        "site_slug": "hyderabad",
        "obs_name": "Hyderabad",
        "district": "HYDERABAD",
        "state": "Telangana",
        "lat": 17.385,
        "lon": 78.4867,
    },
]

STATIONS = _STATIONS


def get_station(loc):
    key = (loc or "new-delhi").strip().lower()
    for s in _STATIONS:
        if s["id"] == key or s["name"].lower() == key:
            return s
    return _STATIONS[0]