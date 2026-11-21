from pathlib import Path

from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY', default='django-insecure-dev-key-change-in-production')
DEBUG = config('DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='*').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'factores',
    'evaluaciones',
    'recomendaciones',
    'literatura',
]

FIXTURE_DIRS = [BASE_DIR / 'fixtures']

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'guiosad.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'guiosad.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='guiosad'),
        'USER': config('DB_USER', default='guiosad'),
        'PASSWORD': config('DB_PASSWORD', default='guiosad'),
        'HOST': config('DB_HOST', default='db'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

LANGUAGE_CODE = 'es-es'
TIME_ZONE = 'America/Guayaquil'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
    ],
}

CORS_ALLOW_ALL_ORIGINS = True

# ── Asistencia con inteligencia artificial (RF-17, RF-18, RF-24) ──
# El modulo es opcional: sin credencial el sistema funciona igual y la interfaz
# oculta el asistente (RNF-13). Nunca participa en el calculo.
ANTHROPIC_API_KEY = config('ANTHROPIC_API_KEY', default='')
IA_HABILITADA = config('IA_HABILITADA', default=True, cast=bool)
# «Evaluar con plantilla» (Excel). Con False se ocultan la página y sus rutas;
# el resto del sistema no depende de ella.
PLANTILLA_HABILITADA = config('PLANTILLA_HABILITADA', default=True, cast=bool)
# Proveedor del asistente: anthropic | openai | groq (gratis; usa GROQ_API_KEYS)
IA_PROVEEDOR = config('IA_PROVEEDOR', default='anthropic')
IA_MODELO_GROQ = config('IA_MODELO_GROQ', default='openai/gpt-oss-120b')
# OpenAI (ChatGPT). Clave en https://platform.openai.com/api-keys
OPENAI_API_KEY = config('OPENAI_API_KEY', default='')
OPENAI_MODELO = config('OPENAI_MODELO', default='gpt-5-mini')

# ── Importancia de la literatura (innovación CP2) ──
# La IA solo clasifica artículos: el conteo y las fórmulas 5.1/5.2 y la Figura
# 5.10 se ejecutan siempre en codigo determinista (literatura/calculo.py).
LIT_OPENALEX_MAILTO = config('LIT_OPENALEX_MAILTO', default='')
OPENALEX_API_KEY = config('OPENALEX_API_KEY', default='')
SCOPUS_API_KEY = config('SCOPUS_API_KEY', default='')
SCOPUS_INST_TOKEN = config('SCOPUS_INST_TOKEN', default='')
SCOPUS_VIEW = config('SCOPUS_VIEW', default='STANDARD')
SCOPUS_QUERY = config('SCOPUS_QUERY', default='')
LIT_CLASIFICADOR = config('LIT_CLASIFICADOR', default='anthropic')
LIT_PROVEEDOR_IA = config('LIT_PROVEEDOR_IA', default=LIT_CLASIFICADOR)
GROQ_API_KEY = config('GROQ_API_KEY', default='')
GROQ_API_KEYS = [
    clave.strip()
    for clave in config('GROQ_API_KEYS', default='').split(',')
    if clave.strip()
]
LIT_GROQ_SEED = config('LIT_GROQ_SEED', default=42, cast=int)
LIT_GROQ_TPM = config('LIT_GROQ_TPM', default=8000, cast=int)
LIT_GROQ_TPM_MARGEN = config('LIT_GROQ_TPM_MARGEN', default=0.85, cast=float)
LIT_GROQ_REINTENTOS = config('LIT_GROQ_REINTENTOS', default=5, cast=int)
LIT_GROQ_RESUMEN_MAX = config('LIT_GROQ_RESUMEN_MAX', default=1800, cast=int)
LIT_MODELO = config('LIT_MODELO', default='')
_MODELOS_POR_DEFECTO = {
    'anthropic': 'claude-opus-5-5',
    'groq': 'openai/gpt-oss-120b',
    'openai': OPENAI_MODELO,
    'demo': 'demo-determinista',
}
if not LIT_MODELO:
    LIT_MODELO = _MODELOS_POR_DEFECTO.get(LIT_PROVEEDOR_IA, _MODELOS_POR_DEFECTO['anthropic'])
LIT_METODO_TC = config('LIT_METODO_TC', default='menciones')
LIT_MAX_PAGINAS = config('LIT_MAX_PAGINAS', default=10, cast=int)
LIT_MAX_ARTICULOS = config('LIT_MAX_ARTICULOS', default=0, cast=int)
LIT_REINTENTOS_PARSEO = config('LIT_REINTENTOS_PARSEO', default=1, cast=int)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'guiosad': {
            'format': '{asctime} {levelname} {name} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'guiosad',
        },
    },
    'loggers': {
        'literatura': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.server': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
