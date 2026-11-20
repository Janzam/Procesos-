"""Datos de referencia de la Tabla 5.3 de la tesis (Rea Sánchez, 2022, p. 88)."""

NIVELES = {1: "Irrelevante", 2: "Opcional", 3: "Importante", 4: "Fundamental"}

IE_TESIS = 3

TABLA_5_3 = [
    {"id": 1, "nombre": "Compatibilidad", "dimension": "Tecnológica", "ns": 8, "tc": 33, "il": 3, "is": 3},
    {"id": 2, "nombre": "Personalización", "dimension": "Tecnológica", "ns": 6, "tc": 30, "il": 4, "is": 3},
    {"id": 3, "nombre": "Prueba", "dimension": "Tecnológica", "ns": 1, "tc": 4, "il": 3, "is": 3},
    {"id": 4, "nombre": "Fiabilidad", "dimension": "Tecnológica", "ns": 5, "tc": 19, "il": 3, "is": 3},
    {"id": 5, "nombre": "Reusabilidad", "dimension": "Tecnológica", "ns": 2, "tc": 5, "il": 2, "is": 2},
    {"id": 6, "nombre": "Usabilidad", "dimension": "Tecnológica", "ns": 4, "tc": 14, "il": 2, "is": 2},
    {"id": 7, "nombre": "Mantenibilidad", "dimension": "Tecnológica", "ns": 1, "tc": 4, "il": 3, "is": 3},
    {"id": 8, "nombre": "Portabilidad", "dimension": "Tecnológica", "ns": 2, "tc": 4, "il": 2, "is": 2},
    {"id": 9, "nombre": "Documentación", "dimension": "Tecnológica", "ns": 11, "tc": 20, "il": 1, "is": 2},
    {"id": 10, "nombre": "Formación", "dimension": "Organizacional", "ns": 4, "tc": 27, "il": 4, "is": 3},
    {"id": 11, "nombre": "Tiempo de adopción", "dimension": "Organizacional", "ns": 2, "tc": 2, "il": 1, "is": 2},
    {"id": 12, "nombre": "Casos de estudio de adopción FLOSS", "dimension": "Organizacional", "ns": 1, "tc": 1, "il": 1, "is": 2},
    {"id": 13, "nombre": "Centralidad de la tecnología de la información", "dimension": "Organizacional", "ns": 2, "tc": 2, "il": 1, "is": 2},
    {"id": 14, "nombre": "Apoyo de la alta dirección", "dimension": "Organizacional", "ns": 1, "tc": 5, "il": 4, "is": 3},
    {"id": 15, "nombre": "Bloqueo de proveedores", "dimension": "Organizacional", "ns": 1, "tc": 3, "il": 2, "is": 2},
    {"id": 16, "nombre": "Soporte", "dimension": "Organizacional", "ns": 6, "tc": 43, "il": 4, "is": 3},
    {"id": 17, "nombre": "Actitud hacia el cambio", "dimension": "Organizacional", "ns": 2, "tc": 3, "il": 1, "is": 2},
    {"id": 18, "nombre": "Coste total de propiedad", "dimension": "Económica", "ns": 2, "tc": 24, "il": 4, "is": 3},
]

ALIAS = {"TCO": "Coste total de propiedad", "Costo total de propiedad": "Coste total de propiedad"}

POR_NOMBRE = {f["nombre"]: f for f in TABLA_5_3}
POR_ID = {f["id"]: f for f in TABLA_5_3}

assert sum(f["ns"] for f in TABLA_5_3) == 61
assert len(TABLA_5_3) == 18
