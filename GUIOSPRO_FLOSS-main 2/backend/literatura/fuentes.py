import hashlib
import re
import time
import requests
from django.conf import settings

FLOSS = re.compile(r"free[\s-]?software|libre[\s-]?software|open[\s-]?source|foss|floss|open[\s-]?source[\s-]?software", re.I)
ADOPCION = re.compile(r"adopt|adoption|adopting|adopted|implement|implementation|migrat", re.I)

TIEMPO_ESPERA = {
    "openalex": 0.12,
    "crossref": 0.12,
    "scopus": 1.05,
}

FUENTES_DISPONIBLES = ["openalex", "crossref", "scopus"]


def configuradas():
    return {
        "openalex": bool(getattr(settings, "LIT_OPENALEX_MAILTO", "")),
        "crossref": bool(getattr(settings, "LIT_OPENALEX_MAILTO", "")),
        "scopus": bool(getattr(settings, "SCOPUS_API_KEY", "")),
    }


def huella_articulo(titulo, anio, doi):
    base = (doi or f"{titulo}|{anio}").strip().lower()
    return hashlib.sha256(base.encode("utf-8")).hexdigest()


def limpiar_doi(valor):
    if not valor:
        return ""
    texto = str(valor).strip()
    texto = re.sub(r"^https?://(dx\.)?doi\.org/", "", texto, flags=re.I)
    return texto


def prefiltrar(titulo, resumen):
    resumen = resumen or ""
    if not resumen.strip():
        return True
    texto = f"{titulo} {resumen}"
    return bool(FLOSS.search(texto) and ADOPCION.search(texto))


def reconstruir_resumen(invertido):
    if not invertido:
        return ""
    posiciones = {}
    for palabra, lugares in invertido.items():
        for lugar in lugares:
            posiciones[lugar] = palabra
    return " ".join(posiciones[i] for i in sorted(posiciones))


RESUMEN_OPENALEX_CACHE = {}


def resumen_openalex_por_doi(doi):
    if not doi or doi in RESUMEN_OPENALEX_CACHE:
        return RESUMEN_OPENALEX_CACHE.get(doi, "")
    correo = getattr(settings, "LIT_OPENALEX_MAILTO", "")
    if not correo:
        RESUMEN_OPENALEX_CACHE[doi] = ""
        return ""
    try:
        respuesta = requests.get(
            "https://api.openalex.org/works",
            params={"filter": f"doi:{doi}", "per_page": 1, "mailto": correo},
            timeout=45,
        )
        respuesta.raise_for_status()
        resultados = respuesta.json().get("results") or []
        resumen = reconstruir_resumen((resultados[0] or {}).get("abstract_inverted_index")) if resultados else ""
    except requests.RequestException:
        resumen = ""
    RESUMEN_OPENALEX_CACHE[doi] = resumen
    time.sleep(TIEMPO_ESPERA["openalex"])
    return resumen


def buscar_openalex(inicio, fin, emitir, limite_paginas):
    correo = getattr(settings, "LIT_OPENALEX_MAILTO", "")
    if not correo:
        raise RuntimeError("OpenAlex requiere LIT_OPENALEX_MAILTO en el entorno")

    url = "https://api.openalex.org/works"
    filtro = (
        f"from_publication_date:{inicio}-01-01,to_publication_date:{fin}-12-31,"
        "type:article,primary_location.source.type:journal"
    )
    clave = getattr(settings, "OPENALEX_API_KEY", "")
    usar_cursor = bool(clave)
    cursor = "*"
    vistos = 0
    for pagina in range(limite_paginas):
        params = {
            "filter": filtro,
            "search": "adoption open source software",
            "per_page": 100,
            "mailto": correo,
        }
        if clave:
            params["api_key"] = clave
        if usar_cursor:
            params["cursor"] = cursor
        else:
            params["page"] = pagina + 1
        respuesta = requests.get(url, params=params, timeout=45)
        if respuesta.status_code == 401:
            emitir("Descargando OpenAlex",
                   "OpenAlex requiere api_key para paginar con cursor; se conserva lo ya descargado",
                   {"fuente": "openalex"}, "aviso")
            break
        respuesta.raise_for_status()
        cuerpo = respuesta.json()
        resultados = cuerpo.get("results", [])
        for obra in resultados:
            titulo = obra.get("display_name") or obra.get("title") or ""
            resumen = reconstruir_resumen(obra.get("abstract_inverted_index"))
            fuente = (obra.get("primary_location") or {}).get("source") or {}
            doi = limpiar_doi(obra.get("doi"))
            anio = obra.get("publication_year")
            if not titulo or not prefiltrar(titulo, resumen):
                continue
            vistos += 1
            yield {
                "huella": huella_articulo(titulo, anio, doi),
                "doi": doi,
                "titulo": titulo,
                "resumen": resumen,
                "revista": fuente.get("display_name") or "",
                "anio": anio,
                "fuente": "openalex",
                "url": doi and f"https://doi.org/{doi}" or obra.get("id") or "",
                "datos_crudos": {"citas": obra.get("cited_by_count", 0), "obra_id": obra.get("id")},
            }
        cursor = (cuerpo.get("meta") or {}).get("next_cursor")
        emitir("Descargando OpenAlex", f"Página {pagina + 1}: {len(resultados)} obras, {vistos} candidatos",
               {"fuente": "openalex", "pagina": pagina + 1, "candidatos": vistos})
        if not resultados:
            break
        if usar_cursor:
            if not cursor:
                break
        elif (pagina + 1) * 100 >= 10000:
            break
        time.sleep(TIEMPO_ESPERA["openalex"])


def buscar_crossref(inicio, fin, emitir, limite_paginas):
    correo = getattr(settings, "LIT_OPENALEX_MAILTO", "")
    if not correo:
        raise RuntimeError("Crossref requiere LIT_OPENALEX_MAILTO en el entorno")

    url = "https://api.crossref.org/works"
    fila = 0
    vistos = 0
    for pagina in range(limite_paginas):
        params = {
            "query.bibliographic": "adoption open source software",
            "filter": f"from-pub-date:{inicio}-01-01,until-pub-date:{fin}-12-31,type:journal-article",
            "rows": 200,
            "offset": fila,
            "mailto": correo,
            "select": "DOI,title,abstract,container-title,published,URL,is-referenced-by-count",
        }
        respuesta = requests.get(url, params=params, timeout=45,
                                 headers={"User-Agent": f"GUIOSAD-literatura/1.0 (mailto:{correo})"})
        respuesta.raise_for_status()
        items = (respuesta.json().get("message") or {}).get("items", [])
        for item in items:
            titulo = (item.get("title") or [""])[0]
            resumen = re.sub(r"<[^>]+>", " ", item.get("abstract") or "")
            if not titulo or not prefiltrar(titulo, resumen):
                continue
            partes = (((item.get("published") or {}).get("date-parts") or [[None]])[0])
            anio = partes[0] if partes else None
            doi = limpiar_doi(item.get("DOI"))
            vistos += 1
            yield {
                "huella": huella_articulo(titulo, anio, doi),
                "doi": doi,
                "titulo": titulo,
                "resumen": resumen,
                "revista": (item.get("container-title") or [""])[0],
                "anio": anio,
                "fuente": "crossref",
                "url": item.get("URL") or (doi and f"https://doi.org/{doi}" or ""),
                "datos_crudos": {"citas": item.get("is-referenced-by-count", 0)},
            }
        fila += len(items)
        emitir("Descargando Crossref", f"Página {pagina + 1}: {len(items)} obras, {vistos} candidatos",
               {"fuente": "crossref", "pagina": pagina + 1, "candidatos": vistos})
        if len(items) < 200:
            break
        time.sleep(TIEMPO_ESPERA["crossref"])


def buscar_scopus(inicio, fin, emitir, limite_paginas):
    clave = getattr(settings, "SCOPUS_API_KEY", "")
    if not clave:
        raise RuntimeError("Scopus requiere SCOPUS_API_KEY en el entorno")

    token = getattr(settings, "SCOPUS_INST_TOKEN", "")
    consulta = getattr(settings, "SCOPUS_QUERY", "") or (
        'TITLE-ABS-KEY((adopt* OR "adoption") AND ("free software" OR '
        '"libre software" OR "open source software" OR foss OR floss))'
    )
    consulta += f" AND PUBYEAR > {inicio - 1} AND PUBYEAR < {fin + 1}"
    consulta += " AND DOCTYPE(ar) AND LANGUAGE(english)"

    cabeceras = {"X-ELS-APIKey": clave, "Accept": "application/json"}
    if token:
        cabeceras["X-ELS-Insttoken"] = token

    start = 0
    vistos = 0
    vista = getattr(settings, "SCOPUS_VIEW", "STANDARD")
    for pagina in range(limite_paginas):
        por_pagina = 200 if vista else 25
        params = {"query": consulta, "count": por_pagina, "start": start}
        if vista:
            params["view"] = vista
        respuesta = requests.get(
            "https://api.elsevier.com/content/search/scopus",
            params=params,
            headers=cabeceras,
            timeout=45,
        )
        if respuesta.status_code == 429:
            raise RuntimeError("Scopus devolvió 429: límite de peticiones alcanzado")
        if (
            respuesta.status_code in (401, 403)
            and vista
            and "view" in (respuesta.text or "").lower()
        ):
            emitir("Descargando Scopus",
                   f"La vista {vista} no está autorizada; se reintenta con la vista básica",
                   {"fuente": "scopus", "vista": vista}, "aviso")
            vista = ""
            params = {clave_param: valor for clave_param, valor in params.items()
                      if clave_param != "view"}
            params["count"] = 25
            respuesta = requests.get(
                "https://api.elsevier.com/content/search/scopus",
                params=params,
                headers=cabeceras,
                timeout=45,
            )
        if respuesta.status_code == 400:
            raise RuntimeError(
                f"Scopus devolvió 400: {(respuesta.text or '')[:300]} | consulta={consulta}"
            )
        respuesta.raise_for_status()
        entradas = (respuesta.json().get("search-results") or {}).get("entry", [])
        for item in entradas:
            titulo = item.get("dc:title") or ""
            resumen = item.get("dc:description") or ""
            if not titulo or not prefiltrar(titulo, resumen):
                continue
            doi = limpiar_doi(item.get("prism:doi"))
            anio = None
            cover = item.get("prism:coverDate") or ""
            if len(cover) >= 4 and cover[:4].isdigit():
                anio = int(cover[:4])
            vistos += 1
            yield {
                "huella": huella_articulo(titulo, anio, doi),
                "doi": doi,
                "titulo": titulo,
                "resumen": resumen,
                "revista": item.get("prism:publicationName") or "",
                "anio": anio,
                "fuente": "scopus",
                "url": item.get("prism:url") or (doi and f"https://doi.org/{doi}" or ""),
                "datos_crudos": {"citas": int(item.get("citedby-count") or 0)},
            }
        start += len(entradas)
        emitir("Descargando Scopus", f"Página {pagina + 1}: {len(entradas)} obras, {vistos} candidatos",
               {"fuente": "scopus", "pagina": pagina + 1, "candidatos": vistos})
        if len(entradas) < por_pagina:
            break
        time.sleep(TIEMPO_ESPERA["scopus"])


BUSCADORES = {
    "openalex": buscar_openalex,
    "crossref": buscar_crossref,
    "scopus": buscar_scopus,
}


def buscar(fuentes, inicio, fin, emitir, limite_paginas=None):
    limite = limite_paginas or getattr(settings, "LIT_MAX_PAGINAS", 10)
    vistas = set()
    for nombre in fuentes:
        if nombre not in BUSCADORES:
            raise ValueError(f"Fuente desconocida: {nombre}")
        emitir("Descarga", f"Iniciando {nombre} para {inicio}-{fin}", {"fuente": nombre})
        generador = BUSCADORES[nombre](inicio, fin, emitir, limite)
        enriquecidos = 0
        for articulo in generador:
            if nombre != "openalex" and not articulo["resumen"] and articulo["doi"]:
                resumen = resumen_openalex_por_doi(articulo["doi"])
                if resumen:
                    articulo = dict(articulo)
                    articulo["resumen"] = resumen
                    crudos = dict(articulo.get("datos_crudos") or {})
                    crudos["resumen_enriquecido"] = "openalex"
                    articulo["datos_crudos"] = crudos
                    enriquecidos += 1
            clave = articulo["doi"] or articulo["huella"]
            if clave in vistas:
                continue
            vistas.add(clave)
            yield articulo
        if enriquecidos:
            emitir("Descarga", f"{enriquecidos} resúmenes recuperados de OpenAlex",
                   {"fuente": nombre, "enriquecidos": enriquecidos}, "ok")
        emitir("Descarga", f"Fin de {nombre}", {"fuente": nombre})
