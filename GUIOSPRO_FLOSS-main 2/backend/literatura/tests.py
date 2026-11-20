from io import StringIO
from unittest.mock import Mock, patch

from django.core.management import call_command
from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APIClient

from factores.models import Factor
from literatura import calculo, clasificador, fuentes, pipeline
from literatura.datos import prompts
from literatura.datos.tabla_5_3 import TABLA_5_3
from literatura.models import Articulo, Clasificacion, Corrida, EventoProgreso, RespuestaIABruta, ResultadoFactor


class CalculoTest(SimpleTestCase):
    def test_reproduce_tabla_5_3(self):
        resultado = calculo.calcular({f["id"]: f["tc"] for f in TABLA_5_3})
        self.assertEqual([round(c, 4) for c in resultado["cortes"]], [1.8636, 3.65, 4.7812])
        metricas = calculo.comparar(resultado["factores"])
        self.assertEqual(metricas["il_exactos"], 18)
        self.assertEqual(metricas["is_iguales"], 18)
        self.assertEqual(metricas["spearman"], 1.0)

    def test_matriz_figura_5_10(self):
        esperado = [
            [1, 1, 2, 2],
            [1, 2, 2, 3],
            [2, 2, 3, 3],
            [2, 3, 3, 4],
        ]
        for a in range(1, 5):
            for b in range(1, 5):
                self.assertEqual(calculo.figura_5_10(a, b), esperado[a - 1][b - 1])

    def test_cuartil_y_spearman(self):
        self.assertEqual(calculo.cuartil_interpolado([1, 2, 3, 4], 0.25), 1.75)
        self.assertEqual(calculo.spearman([1, 2, 3, 4], [1, 2, 3, 4]), 1.0)
        self.assertEqual(calculo.spearman([1, 2, 3, 4], [4, 3, 2, 1]), -1.0)

    def test_acepta_claves_de_json_como_texto(self):
        datos = {str(f["id"]): f["tc"] for f in TABLA_5_3}
        resultado = calculo.calcular(datos)
        self.assertEqual(calculo.comparar(resultado["factores"])["il_exactos"], 18)


class ProveedorIATest(SimpleTestCase):
    def setUp(self):
        clasificador._GROQ_USO.clear()
        clasificador._GROQ_AGOTADAS.clear()

    @override_settings(LIT_PROVEEDOR_IA="groq", LIT_MODELO="", GROQ_API_KEY="clave-groq")
    @patch("literatura.clasificador.requests.post")
    def test_groq_usa_clave_modelo_y_temperatura_cero(self, post):
        post.return_value.ok = True
        post.return_value.json.return_value = {
            "choices": [{"message": {"content": '{"floss_adopcion": true, "confianza": 0.9}'}}]
        }
        crudo, modelo = clasificador._llamar("sistema", "plantilla")

        self.assertTrue(crudo["floss_adopcion"])
        self.assertEqual(modelo, "openai/gpt-oss-120b")
        peticion = post.call_args.kwargs
        self.assertEqual(peticion["headers"]["Authorization"], "Bearer clave-groq")
        self.assertEqual(peticion["json"]["temperature"], 0)
        self.assertEqual(peticion["json"]["seed"], 42)
        self.assertEqual(peticion["json"]["model"], "openai/gpt-oss-120b")
        self.assertEqual(peticion["json"]["reasoning_effort"], "low")
        self.assertEqual(peticion["json"]["max_tokens"], 2000)
        self.assertTrue(clasificador.clave_configurada())

    @override_settings(LIT_PROVEEDOR_IA="groq", LIT_MODELO="modelo-antiguo", GROQ_API_KEY="clave-groq")
    @patch("literatura.clasificador.requests.post")
    def test_groq_cambia_de_modelo_si_el_actual_no_existe(self, post):
        no_existe = Mock(ok=False, status_code=404,
                         text='{"error":{"code":"model_not_found"}}')
        no_existe.json.return_value = {}
        correcta = Mock(ok=True, text="")
        correcta.json.return_value = {
            "choices": [{"message": {"content": '{"floss_adopcion": true, "confianza": 0.8}'}}]
        }
        post.side_effect = [no_existe, correcta]

        crudo, modelo = clasificador._llamar("sistema", "plantilla")

        self.assertTrue(crudo["floss_adopcion"])
        self.assertEqual(modelo, "openai/gpt-oss-120b")
        self.assertEqual(post.call_count, 2)

    @override_settings(LIT_PROVEEDOR_IA="groq", LIT_MODELO="", GROQ_API_KEY="clave-groq",
                       LIT_GROQ_REINTENTOS=3)
    @patch("literatura.clasificador.time.sleep")
    @patch("literatura.clasificador._esperar_ventana_groq")
    @patch("literatura.clasificador.requests.post")
    def test_groq_reintenta_429_respetando_el_tiempo_indicado(self, post, _ventana, dormir):
        limitado = Mock(ok=False, status_code=429,
                        text='{"error":{"message":"Please try again in 5.475s"}}',
                        headers={"Retry-After": "6"})
        correcta = Mock(ok=True, text="")
        correcta.json.return_value = {
            "choices": [{"message": {"content": '{"floss_adopcion": true, "confianza": 0.9}'}}],
            "usage": {"total_tokens": 1200},
        }
        post.side_effect = [limitado, correcta]

        crudo, modelo = clasificador._llamar("sistema", "plantilla")

        self.assertTrue(crudo["floss_adopcion"])
        self.assertEqual(modelo, "openai/gpt-oss-120b")
        self.assertEqual(post.call_count, 2)
        dormir.assert_called_once()
        self.assertGreaterEqual(dormir.call_args.args[0], 6.4)
        self.assertEqual(post.call_args_list[0].kwargs["headers"]["Authorization"], "Bearer clave-groq")
        self.assertEqual(post.call_args_list[1].kwargs["headers"]["Authorization"], "Bearer clave-groq")

    @override_settings(LIT_PROVEEDOR_IA="groq", LIT_MODELO="", GROQ_API_KEYS="clave-uno,clave-dos",
                       LIT_GROQ_REINTENTOS=2)
    @patch("literatura.clasificador.time.sleep")
    @patch("literatura.clasificador._esperar_ventana_groq")
    @patch("literatura.clasificador.requests.post")
    def test_groq_rota_a_segunda_key_cuando_429_es_diario(self, post, _ventana, dormir):
        agotada = Mock(ok=False, status_code=429,
                       text='{"error":{"message":"Rate limit reached for requests per day"}}',
                       headers={"x-ratelimit-remaining-requests": "0",
                                "x-ratelimit-reset-requests": "1h"})
        correcta = Mock(ok=True, text="")
        correcta.json.return_value = {
            "choices": [{"message": {"content": '{"floss_adopcion": true, "confianza": 0.9}'}}],
            "usage": {"total_tokens": 1100},
        }
        post.side_effect = [agotada, correcta]

        crudo, _ = clasificador._llamar("sistema", "plantilla")

        self.assertTrue(crudo["floss_adopcion"])
        self.assertEqual(post.call_count, 2)
        self.assertEqual(post.call_args_list[0].kwargs["headers"]["Authorization"], "Bearer clave-uno")
        self.assertEqual(post.call_args_list[1].kwargs["headers"]["Authorization"], "Bearer clave-dos")
        dormir.assert_not_called()

    @override_settings(LIT_PROVEEDOR_IA="groq", LIT_MODELO="", GROQ_API_KEYS="clave-a,clave-b",
                       LIT_GROQ_REINTENTOS=1)
    @patch("literatura.clasificador._esperar_ventana_groq")
    @patch("literatura.clasificador.requests.post")
    def test_groq_sin_cupo_cuando_todas_las_keys_agotan(self, post, _ventana):
        agotada = Mock(ok=False, status_code=429,
                       text='{"error":{"message":"Rate limit reached for tokens per day"}}',
                       headers={"x-ratelimit-remaining-requests": "0"})
        post.side_effect = [agotada, agotada]

        with self.assertRaises(clasificador.GroqSinCupo):
            clasificador._llamar("sistema", "plantilla")

        self.assertEqual(post.call_count, 2)

    @override_settings(LIT_PROVEEDOR_IA="groq", GROQ_API_KEYS="clave-uno,clave-dos",
                       LIT_GROQ_TPM=3000, LIT_GROQ_TPM_MARGEN=0.5)
    @patch("literatura.clasificador.time.sleep")
    @patch("literatura.clasificador.time.monotonic")
    def test_ventana_tpm_es_independiente_por_key(self, monotona, dormir):
        ahora = 1000.0
        monotona.side_effect = [ahora, ahora + 61, ahora + 61, ahora + 61]
        with clasificador._GROQ_BLOQUEO:
            clasificador._GROQ_USO["aaa"] = clasificador.deque([(ahora, 1200)])

        clasificador._esperar_ventana_groq(400, "aaa")
        dormir.assert_called_once()
        dormir.reset_mock()

        clasificador._esperar_ventana_groq(400, "bbb")
        dormir.assert_not_called()

    @override_settings(LIT_PROVEEDOR_IA="groq", GROQ_API_KEYS=" , clave-uno , clave-dos,clave-uno ",
                       GROQ_API_KEY="")
    def test_clave_configurada_usa_lista_y_deduplica(self):
        self.assertTrue(clasificador.clave_configurada())
        self.assertEqual(clasificador._claves_groq(), ["clave-uno", "clave-dos"])

    def test_prompt_compacto_solo_cambia_la_version_de_groq(self):
        self.assertEqual(prompts.version_activa("anthropic"), prompts.VERSION)
        self.assertEqual(prompts.version_activa("groq"), prompts.VERSION + "-groq-lite")
        self.assertEqual(prompts.version_activa("groq", "sub"), prompts.VERSION_SUB_GROQ + "-groq-lite")
        self.assertEqual(prompts.version_activa("anthropic", "sub"), prompts.VERSION)
        self.assertLess(len(prompts.SISTEMA_RELEVANCIA_GROQ), len(prompts.SISTEMA_RELEVANCIA))

        sistema_sub = prompts.sistema_subfactores_groq([
            {"id": 2, "nombre": "Personalización", "subfactores": [
                {"id": 10, "nombre": "Ampliar modificando código"},
            ]},
        ])
        self.assertIn('"confianza": 0.85', sistema_sub)
        self.assertIn("no marques ningún subfactor de ese factor", sistema_sub)
        self.assertIn("equivalencia semántica explícita", sistema_sub)
        self.assertIn("carencias del propietario si motivan su adopción", sistema_sub)
        self.assertIn("cost saving, financial benefits", sistema_sub)
        self.assertIn("reduced or avoided vendor dependence", sistema_sub)
        self.assertIn("dependence on proprietary suppliers mentioned as a reason", sistema_sub)
        self.assertIn("community development alone", sistema_sub)
        self.assertIn("rapid diffusion or successful implementations", sistema_sub)
        self.assertIn("claves = IDs exactos de su capa", sistema_sub)
        self.assertIn("subfactores_extendidos", sistema_sub)
        self.assertIn("evidencia_extendida", sistema_sub)
        self.assertIn("incluye TODOS los IDs", sistema_sub)
        self.assertIn("Nunca devuelvas un subconjunto", sistema_sub)
        self.assertIn("vendor lock-in", sistema_sub)
        self.assertIn("Technological customization", sistema_sub)
        self.assertIn("source code can be easily extended", sistema_sub)
        self.assertEqual(prompts.version_activa("groq", "sub"), "lit-v1-2026-11-25-groq-lite")

    def test_reglas_permisivas_favorecen_reproduccion_tabla(self):
        sistema_sub = prompts.sistema_subfactores_groq([
            {"id": 14, "nombre": "Apoyo de la alta dirección", "subfactores": [
                {"id": 50, "nombre": "Apoyo de la alta dirección"},
            ]},
        ])
        self.assertIn("carencias del propietario si motivan su adopción", sistema_sub)
        self.assertIn("top management support described as important, paramount, recommended", sistema_sub)
        self.assertIn("financial or human-capital constraints motivating FLOSS", sistema_sub)
        self.assertIn("recommended or important training when it favors FLOSS adoption", sistema_sub)
        self.assertIn("Nunca devuelvas un subconjunto", sistema_sub)

    @override_settings(LIT_PROVEEDOR_IA="anthropic", LIT_MODELO="", ANTHROPIC_API_KEY="")
    def test_anthropic_sigue_disponible_y_modelo_por_defecto(self):
        self.assertEqual(clasificador.proveedor(), "anthropic")
        self.assertEqual(clasificador.modelo_activo(), "claude-opus-5-5")
        self.assertFalse(clasificador.clave_configurada())


def articulo_falso(numero):
    return {
        "huella": f"h{numero}",
        "doi": f"10.1000/falso{numero}",
        "titulo": f"Adopción de open source software en organización {numero}",
        "resumen": "Estudio de adopción de FLOSS y sus factores de compatibilidad y soporte.",
        "revista": "Revista de prueba",
        "anio": 2022,
        "fuente": "openalex",
        "url": "",
        "datos_crudos": {"citas": numero},
    }


class TrazabilidadIATest(TestCase):
    fixtures = ["factores.json", "subfactores.json"]

    def _contexto(self, huella):
        articulo = Articulo.objects.create(
            huella=huella,
            titulo="Adopción de open source software en una organización",
            resumen="Estudio de adopción de FLOSS y compatibilidad con sistemas existentes.",
            anio=2022,
            fuente="openalex",
        )
        corrida = Corrida.objects.create(
            nombre=f"Trazabilidad {huella}",
            anio_inicio=2020,
            anio_fin=2025,
            fuentes=["openalex"],
            metodo_tc="unicos",
            modelo_ia="openai/gpt-oss-120b",
            version_prompt="lit-v1-2026-11-16-groq-lite",
        )
        return articulo, corrida

    @override_settings(LIT_PROVEEDOR_IA="groq", LIT_MODELO="openai/gpt-oss-120b",
                       GROQ_API_KEY="clave-groq", LIT_REINTENTOS_PARSEO=0)
    @patch("literatura.clasificador._esperar_ventana_groq")
    @patch("literatura.clasificador.requests.post")
    def test_respuesta_sin_json_queda_registrada(self, post, _ventana):
        post.return_value.ok = True
        post.return_value.json.return_value = {
            "choices": [{"message": {"content": "El modelo se negó a responder"}}],
            "usage": {"total_tokens": 100},
        }
        articulo, corrida = self._contexto("h-sin-json")

        with self.assertLogs("literatura.clasificador", level="ERROR") as registros:
            with self.assertRaises(clasificador.RespuestaIAMalformada):
                clasificador._etapa(articulo, corrida, "rel", "sistema", "plantilla")

        self.assertIn("El modelo no devolvió un objeto JSON", "\n".join(registros.output))
        bruta = RespuestaIABruta.objects.get(articulo=articulo)
        self.assertEqual(bruta.estado, "error_parseo")
        self.assertEqual(bruta.proveedor, "groq")
        self.assertIn("El modelo se negó a responder", bruta.texto)
        self.assertFalse(Clasificacion.objects.filter(articulo=articulo).exists())

    @override_settings(LIT_PROVEEDOR_IA="groq", LIT_MODELO="openai/gpt-oss-120b",
                       GROQ_API_KEY="clave-groq", LIT_REINTENTOS_PARSEO=1)
    @patch("literatura.clasificador._esperar_ventana_groq")
    @patch("literatura.clasificador.requests.post")
    def test_reintento_estricto_recupera_y_deja_un_registro_del_fallo(self, post, _ventana):
        mal = Mock(ok=True, text="")
        mal.json.return_value = {
            "choices": [{"message": {"content": "sin json"}}],
            "usage": {"total_tokens": 100},
        }
        bien = Mock(ok=True, text="")
        bien.json.return_value = {
            "choices": [{"message": {"content": '{"floss_adopcion": true, "confianza": 0.9}'}}],
            "usage": {"total_tokens": 120},
        }
        post.side_effect = [mal, bien]
        articulo, corrida = self._contexto("h-reintento")

        crudo, desde_cache = clasificador._etapa(articulo, corrida, "rel", "sistema", "plantilla")

        self.assertTrue(crudo["floss_adopcion"])
        self.assertFalse(desde_cache)
        self.assertEqual(post.call_count, 2)
        self.assertIn("REINTENTO ESTRICTO", post.call_args_list[1].kwargs["json"]["messages"][1]["content"])
        self.assertEqual(RespuestaIABruta.objects.filter(articulo=articulo).count(), 1)
        self.assertTrue(Clasificacion.objects.filter(articulo=articulo, etapa="rel").exists())

    @override_settings(LIT_PROVEEDOR_IA="groq", LIT_MODELO="openai/gpt-oss-120b", GROQ_API_KEY="clave-groq")
    @patch("literatura.clasificador._llamar_con_uso")
    def test_version_de_sub_groq_no_invalida_la_de_relevancia(self, llamar):
        llamar.side_effect = [
            ({"floss_adopcion": True, "confianza": 0.9}, "openai/gpt-oss-120b", {}),
            ({"subfactores": [], "evidencia": {}, "confianza": 0.0}, "openai/gpt-oss-120b", {}),
        ]
        articulo, corrida = self._contexto("h-versiones")

        clasificador._etapa(articulo, corrida, "rel", "sistema", "plantilla")
        clasificador._etapa(articulo, corrida, "sub", "sistema", "plantilla")

        self.assertEqual(
            Clasificacion.objects.get(articulo=articulo, etapa="rel").version_prompt,
            prompts.VERSION + "-groq-lite",
        )
        self.assertEqual(
            Clasificacion.objects.get(articulo=articulo, etapa="sub").version_prompt,
            prompts.VERSION_SUB_GROQ + "-groq-lite",
        )

    @override_settings(LIT_PROVEEDOR_IA="groq", LIT_MODELO="openai/gpt-oss-120b", GROQ_API_KEY="clave-groq")
    @patch("literatura.clasificador._llamar_con_uso")
    def test_evidencia_con_clave_invalida_se_normaliza_al_id_unico(self, llamar):
        llamar.return_value = (
            {"subfactores": [61], "evidencia": {"1": "cost saving"}, "confianza": 0.85},
            "openai/gpt-oss-120b",
            {},
        )
        articulo, corrida = self._contexto("h-evidencia")

        clasificador._etapa(articulo, corrida, "sub", "sistema", "plantilla")

        clasificacion = Clasificacion.objects.get(articulo=articulo, etapa="sub")
        self.assertEqual(clasificacion.subfactores, [61])
        self.assertEqual(clasificacion.evidencia, {"61": "cost saving"})

    @override_settings(LIT_PROVEEDOR_IA="groq", LIT_MODELO="openai/gpt-oss-120b", GROQ_API_KEY="clave-groq")
    @patch("literatura.clasificador._llamar_con_uso")
    def test_capa_extendida_se_guarda_separadamente(self, llamar):
        llamar.return_value = (
            {
                "subfactores": [61],
                "evidencia": {"61": "cost saving"},
                "subfactores_extendidos": [61, 52],
                "evidencia_extendida": {"61": "cost saving", "52": "support was available"},
                "confianza": 0.85,
            },
            "openai/gpt-oss-120b",
            {},
        )
        articulo, corrida = self._contexto("h-extendida")

        salida, desde_cache = clasificador._etapa(articulo, corrida, "sub", "sistema", "plantilla")

        self.assertFalse(desde_cache)
        self.assertEqual(salida["subfactores"], [61])
        self.assertEqual(salida["subfactores_extendidos"], [52, 61])
        registro = Clasificacion.objects.get(articulo=articulo, etapa="sub")
        self.assertEqual(registro.subfactores, [61])
        self.assertEqual(registro.subfactores_extendidos, [52, 61])
        self.assertEqual(registro.evidencia_extendida, {
            "61": "cost saving",
            "52": "support was available",
        })

    @override_settings(LIT_PROVEEDOR_IA="groq", LIT_MODELO="openai/gpt-oss-120b", GROQ_API_KEY="clave-groq")
    @patch("literatura.clasificador._llamar_con_uso")
    def test_capa_extendida_siempre_incluye_la_estricta(self, llamar):
        llamar.return_value = (
            {
                "subfactores": [61],
                "evidencia": {"61": "cost saving"},
                "subfactores_extendidos": [],
                "evidencia_extendida": {},
                "confianza": 0.85,
            },
            "openai/gpt-oss-120b",
            {},
        )
        articulo, corrida = self._contexto("h-superset")

        salida, _ = clasificador._etapa(articulo, corrida, "sub", "sistema", "plantilla")

        self.assertEqual(salida["subfactores"], [61])
        self.assertEqual(salida["subfactores_extendidos"], [61])
        self.assertEqual(salida["evidencia_extendida"], {"61": "cost saving"})

    @override_settings(LIT_PROVEEDOR_IA="groq", LIT_MODELO="openai/gpt-oss-120b", GROQ_API_KEY="clave-groq")
    @patch("literatura.clasificador._llamar_con_uso")
    def test_clasificar_devuelve_y_notifica_las_dos_capas(self, llamar):
        llamar.side_effect = [
            ({"floss_adopcion": True, "confianza": 0.9}, "openai/gpt-oss-120b", {}),
            ({
                "subfactores": [1],
                "evidencia": {"1": "strict"},
                "subfactores_extendidos": [1, 52],
                "evidencia_extendida": {"1": "strict", "52": "extended"},
                "confianza": 0.8,
            }, "openai/gpt-oss-120b", {}),
        ]
        articulo, corrida = self._contexto("h-dual")
        avisos = []

        resultado = clasificador.clasificar(
            articulo, corrida, notificar=lambda etapa, info: avisos.append((etapa, info))
        )

        self.assertEqual(resultado, (True, [1], {"1": "strict"}, 0, [1, 52], {"1": "strict", "52": "extended"}))
        self.assertEqual(avisos[1][1]["subfactores_extendidos"], [1, 52])

    @override_settings(LIT_PROVEEDOR_IA="groq", LIT_MODELO="openai/gpt-oss-120b", GROQ_API_KEY="clave-groq")
    @patch("literatura.clasificador._llamar_con_uso")
    def test_clasificar_notifica_relevancia_y_subfactores(self, llamar):
        llamar.side_effect = [
            ({"floss_adopcion": True, "confianza": 0.9}, "openai/gpt-oss-120b", {}),
            ({"subfactores": [1], "evidencia": {}, "confianza": 0.8}, "openai/gpt-oss-120b", {}),
        ]
        articulo, corrida = self._contexto("h-notificar")
        avisos = []

        clasificador.clasificar(
            articulo, corrida, notificar=lambda etapa, info: avisos.append((etapa, info))
        )

        self.assertEqual([etapa for etapa, _ in avisos], ["rel", "sub"])
        self.assertTrue(avisos[0][1]["es_relevante"])
        self.assertEqual(avisos[1][1]["subfactores"], [1])

    @override_settings(LIT_PROVEEDOR_IA="groq", LIT_MODELO="openai/gpt-oss-120b", GROQ_API_KEY="clave-groq")
    @patch("literatura.clasificador._llamar_con_uso")
    def test_forzar_reanalisis_ignora_y_actualiza_cache(self, llamar):
        llamar.side_effect = [
            ({"floss_adopcion": False, "confianza": 0.2}, "openai/gpt-oss-120b", {}),
            ({"floss_adopcion": True, "confianza": 0.9}, "openai/gpt-oss-120b", {}),
        ]
        articulo, corrida = self._contexto("h-forzar")
        _, desde_cache = clasificador._etapa(articulo, corrida, "rel", "sistema", "plantilla")
        self.assertFalse(desde_cache)

        forzada = Corrida.objects.create(
            nombre="Forzada",
            anio_inicio=2020,
            anio_fin=2025,
            fuentes=["openalex"],
            metodo_tc="unicos",
            modelo_ia="openai/gpt-oss-120b",
            version_prompt=corrida.version_prompt,
            forzar_reanalisis=True,
        )
        crudo, desde_cache = clasificador._etapa(articulo, forzada, "rel", "sistema", "plantilla")

        self.assertFalse(desde_cache)
        self.assertTrue(crudo["floss_adopcion"])
        registro = Clasificacion.objects.get(articulo=articulo, etapa="rel")
        self.assertTrue(registro.es_floss_adopcion)
        self.assertEqual(Clasificacion.objects.filter(articulo=articulo, etapa="rel").count(), 1)


class PipelineTest(TestCase):
    fixtures = ["factores.json", "subfactores.json"]

    def _corrida(self, nombre):
        return Corrida.objects.create(
            nombre=nombre,
            anio_inicio=2020,
            anio_fin=2025,
            fuentes=["openalex"],
            metodo_tc="unicos",
            modelo_ia="demo",
            version_prompt="lit-v1",
        )

    @patch("literatura.clasificador.clasificar", return_value=(True, [1, 10, 18], {}, 0, [1, 10, 18], {}))
    @patch("literatura.fuentes.buscar")
    def test_dos_corridas_iguales_tienen_mismo_hash(self, buscar, clasificar):
        buscar.side_effect = lambda *args, **kwargs: (articulo_falso(i) for i in range(1, 4))

        primera = pipeline.ejecutar(self._corrida("Primera"))
        segunda = pipeline.ejecutar(self._corrida("Segunda"))

        self.assertEqual(primera.estado, "listo")
        self.assertEqual(segunda.estado, "listo")
        self.assertEqual(primera.hash_resultado, segunda.hash_resultado)
        self.assertFalse(primera.es_reproduccion)
        self.assertTrue(segunda.es_reproduccion)
        self.assertEqual(ResultadoFactor.objects.filter(corrida=segunda).count(), 18)

    @patch("literatura.clasificador.clasificar",
           return_value=(True, [1], {}, 0, [1, 52], {}))
    @patch("literatura.fuentes.buscar")
    def test_pipeline_guarda_metricas_de_la_capa_extendida(self, buscar, clasificar):
        buscar.side_effect = lambda *args, **kwargs: (articulo_falso(i) for i in range(1, 4))

        corrida = pipeline.ejecutar(self._corrida("Capa extendida"))

        self.assertEqual(corrida.estado, "listo")
        extendido = corrida.metricas["extendido"]
        self.assertEqual(extendido["total"], 18)
        self.assertTrue(extendido["factores"])
        tc_ext = {f["id"]: f["tc"] for f in extendido["factores"]}
        tc_estricto = {r.factor_id: r.tc for r in corrida.resultados.all()}
        self.assertEqual(tc_ext[16], 3)
        self.assertEqual(tc_estricto[16], 0)
        self.assertTrue(corrida.eventos.filter(mensaje__contains="Capa extendida").exists())

    def test_hash_config_considera_el_limite_de_articulos(self):
        primera = self._corrida("Sin límite")
        segunda = self._corrida("Con límite")
        segunda.max_articulos = 20
        segunda.save(update_fields=["max_articulos"])

        self.assertNotEqual(pipeline.config_hash(primera), pipeline.config_hash(segunda))

    def test_hash_config_no_cambia_por_forzar_reanalisis(self):
        normal = self._corrida("Normal")
        forzada = self._corrida("Forzada")
        forzada.forzar_reanalisis = True
        forzada.save(update_fields=["forzar_reanalisis"])

        self.assertEqual(pipeline.config_hash(normal), pipeline.config_hash(forzada))

    def test_hash_config_no_cambia_por_keys_de_groq(self):
        corrida = self._corrida("Keys")
        with override_settings(GROQ_API_KEYS="a,b"):
            primero = pipeline.config_hash(corrida)
        with override_settings(GROQ_API_KEYS="c,d,e,f,g"):
            segundo = pipeline.config_hash(corrida)

        self.assertEqual(primero, segundo)

    @override_settings(LIT_PROVEEDOR_IA="groq")
    def test_hash_config_considera_paginas_y_version_de_subfactores(self):
        corrida = self._corrida("Hash completo")
        base = pipeline.config_hash(corrida)

        with override_settings(LIT_MAX_PAGINAS=11):
            self.assertNotEqual(pipeline.config_hash(corrida), base)

        with patch.object(prompts, "VERSION_SUB_GROQ", "lit-v1-otra"):
            self.assertNotEqual(pipeline.config_hash(corrida), base)

    @patch("literatura.management.commands.validar_literatura.pipeline.ejecutar")
    def test_comando_validar_acepta_max_articulos(self, ejecutar):
        ejecutar.side_effect = lambda corrida: corrida
        call_command(
            "validar_literatura", "--fuentes", "openalex",
            "--max-articulos", "30", "--nombre", "CLI 30",
            stdout=StringIO(),
        )

        corrida = Corrida.objects.get(nombre="CLI 30")
        self.assertEqual(corrida.max_articulos, 30)

    @patch("literatura.fuentes.buscar")
    @patch("literatura.clasificador.clasificar", return_value=(False, [], {}, 0, [], {}))
    def test_no_pierde_resumen_enriquecido_de_corridas_anteriores(self, clasificar, buscar):
        from literatura.fuentes import huella_articulo

        titulo = "Adoption of an open source platform in a hospital"
        huella = huella_articulo(titulo, 2020, "10.1000/enriquecido")
        Articulo.objects.create(
            huella=huella, titulo=titulo, resumen="Community support was available during adoption.",
            anio=2020, fuente="crossref", doi="10.1000/enriquecido",
            datos_crudos={"resumen_enriquecido": "openalex"},
        )
        buscar.return_value = iter([{
            "huella": huella, "doi": "10.1000/enriquecido", "titulo": titulo,
            "resumen": "", "revista": "", "anio": 2020, "fuente": "crossref",
            "url": "", "datos_crudos": {},
        }])

        pipeline.ejecutar(self._corrida("Enriquecida"))
        actualizado = Articulo.objects.get(huella=huella)

        self.assertEqual(actualizado.resumen, "Community support was available during adoption.")
        self.assertEqual(actualizado.datos_crudos["resumen_enriquecido"], "openalex")

    @patch("literatura.clasificador.clasificar")
    @patch("literatura.fuentes.buscar")
    def test_corrida_se_pausa_cuando_groq_sin_cupo(self, buscar, clasificar):
        buscar.side_effect = lambda *args, **kwargs: (articulo_falso(i) for i in range(1, 3))
        clasificar.side_effect = [
            (True, [1], {}, 0, [1], {}),
            clasificador.GroqSinCupo(10),
        ]

        corrida = pipeline.ejecutar(self._corrida("Pausada"))
        corrida.refresh_from_db()

        self.assertEqual(corrida.estado, "pausada")
        self.assertEqual(corrida.total_clasificados, 1)
        self.assertIsNone(corrida.terminada_en)
        self.assertTrue(EventoProgreso.objects.filter(corrida=corrida, fase="Pausada").exists())

    @patch("literatura.clasificador.clasificar", return_value=(True, [1], {}, 0, [1], {}))
    @patch("literatura.fuentes.buscar")
    def test_limite_de_articulos_corta_descarga_y_clasificacion(self, buscar, clasificar):
        buscados = []

        def buscar_limitado(*args, **kwargs):
            for i in range(1, 6):
                buscados.append(i)
                yield articulo_falso(i)

        buscar.side_effect = buscar_limitado
        corrida = self._corrida("Prueba rápida")
        corrida.max_articulos = 2
        corrida.save(update_fields=["max_articulos"])

        corrida = pipeline.ejecutar(corrida)

        self.assertEqual(corrida.estado, "listo")
        self.assertEqual(corrida.total_articulos, 2)
        self.assertEqual(buscados, [1, 2])
        self.assertEqual(clasificar.call_count, 2)
        self.assertTrue(corrida.eventos.filter(mensaje__contains="tope 2").exists())

    @patch("literatura.clasificador.clasificar", return_value=(True, [1], {}, 0, [1], {}))
    @patch("literatura.fuentes.buscar")
    def test_activar_y_desactivar_actualiza_catalogo(self, buscar, clasificar):
        buscar.side_effect = lambda *args, **kwargs: (articulo_falso(i) for i in range(1, 3))
        corrida = pipeline.ejecutar(self._corrida("Activación"))

        anterior = dict(corrida.is_anterior) or None
        pipeline.activar(corrida)
        self.assertTrue(corrida.activada)
        self.assertTrue(corrida.is_anterior)

        pipeline.desactivar(corrida)
        self.assertFalse(corrida.activada)
        if anterior:
            self.assertEqual(corrida.is_anterior, anterior)

    @patch("literatura.clasificador.clasificar", return_value=(True, [1], {}, 0, [1], {}))
    @patch("literatura.fuentes.buscar")
    def test_aviso_de_fuente_con_nivel_no_rompe_la_corrida(self, buscar, clasificar):
        def buscar_con_aviso(fuentes, inicio, fin, emitir, limite):
            emitir("Descarga", "Vista rechazada", {"vista": "COMPLETE"}, "aviso")
            yield articulo_falso(1)

        buscar.side_effect = buscar_con_aviso

        corrida = pipeline.ejecutar(self._corrida("Aviso Scopus"))

        self.assertEqual(corrida.estado, "listo")
        self.assertEqual(corrida.mensaje, "Cálculo finalizado")

    @patch("literatura.clasificador.clasificar")
    @patch("literatura.fuentes.buscar")
    def test_respuesta_malformada_no_detiene_la_corrida(self, buscar, clasificar):
        buscar.side_effect = lambda *args, **kwargs: (articulo_falso(i) for i in range(1, 4))

        def clasificar_con_un_fallo(articulo, corrida, notificar=None):
            if articulo.huella == "h2":
                raise clasificador.RespuestaIAMalformada(
                    "sin json", "modelo-x", {}, "El modelo no devolvió un objeto JSON"
                )
            return True, [1], {}, 0, [1], {}

        clasificar.side_effect = clasificar_con_un_fallo
        corrida = pipeline.ejecutar(self._corrida("Omisiones"))

        self.assertEqual(corrida.estado, "listo")
        self.assertEqual(corrida.total_omitidos, 1)
        self.assertEqual(ResultadoFactor.objects.filter(corrida=corrida).count(), 18)
        self.assertTrue(corrida.eventos.filter(nivel="aviso", mensaje__contains="omitido").exists())

    @patch("literatura.clasificador.clasificar")
    @patch("literatura.fuentes.buscar")
    def test_eventos_en_vivo_muestran_titulo_relevancia_y_factores(self, buscar, clasificar):
        buscar.side_effect = lambda *args, **kwargs: (articulo_falso(1) for i in range(1, 2))

        def clasificar_con_avisos(articulo, corrida, notificar=None):
            notificar("rel", {"es_relevante": True, "confianza": 0.9, "desde_cache": 1})
            notificar("sub", {"subfactores": [1], "desde_cache": 0})
            return True, [1], {}, 1

        clasificar.side_effect = clasificar_con_avisos
        corrida = pipeline.ejecutar(self._corrida("En vivo"))

        eventos = [ev.datos for ev in corrida.eventos.all() if ev.datos.get("tipo")]
        self.assertEqual([d["tipo"] for d in eventos], ["articulo", "relevancia", "factores"])
        self.assertTrue(eventos[0]["titulo"].startswith("Adopción de open source"))
        self.assertTrue(eventos[1]["relevante"])
        self.assertTrue(eventos[2]["factores"])

    def test_progreso_expone_total_omitidos_y_limite(self):
        corrida = self._corrida("Progreso omitidos")
        corrida.total_omitidos = 2
        corrida.max_articulos = 20
        corrida.save(update_fields=["total_omitidos", "max_articulos"])

        respuesta = APIClient().get(f"/api/literatura/corridas/{corrida.id}/progreso/")

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data["total_omitidos"], 2)
        self.assertEqual(respuesta.data["max_articulos"], 20)


class CorridaApiTest(TestCase):
    @patch("literatura.views.pipeline.iniciar_en_hilo")
    def test_post_acepta_max_articulos(self, iniciar):
        respuesta = APIClient().post(
            "/api/literatura/corridas/",
            {"fuentes": ["openalex"], "max_articulos": 20},
            format="json",
        )

        self.assertEqual(respuesta.status_code, 202)
        self.assertEqual(respuesta.data["max_articulos"], 20)
        self.assertEqual(Corrida.objects.get(id=respuesta.data["id"]).max_articulos, 20)
        iniciar.assert_called_once()

    @patch("literatura.views.pipeline.iniciar_en_hilo")
    def test_post_acepta_forzar_reanalisis(self, iniciar):
        respuesta = APIClient().post(
            "/api/literatura/corridas/",
            {"fuentes": ["openalex"], "forzar_reanalisis": True},
            format="json",
        )

        self.assertEqual(respuesta.status_code, 202)
        self.assertTrue(respuesta.data["forzar_reanalisis"])
        self.assertTrue(Corrida.objects.get(id=respuesta.data["id"]).forzar_reanalisis)
        iniciar.assert_called_once()

    @patch("literatura.views.pipeline.iniciar_en_hilo")
    def test_post_rechaza_max_articulos_negativo(self, iniciar):
        respuesta = APIClient().post(
            "/api/literatura/corridas/",
            {"fuentes": ["openalex"], "max_articulos": -1},
            format="json",
        )

        self.assertEqual(respuesta.status_code, 400)
        self.assertFalse(Corrida.objects.exists())
        iniciar.assert_not_called()

    @patch("literatura.views.pipeline.iniciar_en_hilo")
    def test_reanudar_solo_corridas_pausadas(self, iniciar):
        pausada = Corrida.objects.create(
            nombre="Pausada", anio_inicio=2020, anio_fin=2025, fuentes=["openalex"],
            modelo_ia="demo", version_prompt="lit-v1", estado="pausada",
        )
        lista = Corrida.objects.create(
            nombre="Lista", anio_inicio=2020, anio_fin=2025, fuentes=["openalex"],
            modelo_ia="demo", version_prompt="lit-v1", estado="listo",
        )
        cliente = APIClient()

        respuesta = cliente.post(f"/api/literatura/corridas/{pausada.id}/reanudar/")
        self.assertEqual(respuesta.status_code, 202)
        pausada.refresh_from_db()
        self.assertEqual(pausada.estado, "pendiente")
        iniciar.assert_called_once()

        rechazada = cliente.post(f"/api/literatura/corridas/{lista.id}/reanudar/")
        self.assertEqual(rechazada.status_code, 409)
        self.assertEqual(iniciar.call_count, 1)


class CorridaEliminarTest(TestCase):
    fixtures = ["factores.json", "subfactores.json"]

    def _corrida(self, estado="listo", activada=False):
        return Corrida.objects.create(
            nombre="Para borrar", anio_inicio=2020, anio_fin=2025,
            fuentes=["openalex"], metodo_tc="menciones", modelo_ia="demo",
            version_prompt="lit-v1", estado=estado, activada=activada,
        )

    def test_elimina_resultados_y_eventos_pero_conserva_cache_y_articulos(self):
        corrida = self._corrida()
        articulo = Articulo.objects.create(
            huella="huella-cache-eliminar", titulo="Adopción FLOSS",
            resumen="Estudio de adopción", anio=2022, fuente="openalex",
        )
        clasificacion = Clasificacion.objects.create(
            articulo=articulo, corrida=corrida, etapa="rel",
            version_prompt="lit-v1", modelo="demo",
            huella="huella-cache-eliminar|rel|lit-v1",
        )
        ResultadoFactor.objects.create(
            corrida=corrida, factor=Factor.objects.get(pk=1), ns=8,
        )
        EventoProgreso.objects.create(
            corrida=corrida, fase="Listo", mensaje="Cálculo finalizado",
        )

        respuesta = APIClient().delete(f"/api/literatura/corridas/{corrida.id}/")

        self.assertEqual(respuesta.status_code, 204)
        self.assertFalse(Corrida.objects.filter(pk=corrida.pk).exists())
        self.assertFalse(ResultadoFactor.objects.filter(corrida_id=corrida.pk).exists())
        self.assertFalse(EventoProgreso.objects.filter(corrida_id=corrida.pk).exists())
        self.assertTrue(Articulo.objects.filter(pk=articulo.pk).exists())
        clasificacion.refresh_from_db()
        self.assertIsNone(clasificacion.corrida_id)
        self.assertTrue(Clasificacion.objects.filter(
            huella="huella-cache-eliminar|rel|lit-v1"
        ).exists())

    def test_no_elimina_corridas_en_curso(self):
        for estado in ("pendiente", "ejecutando"):
            with self.subTest(estado=estado):
                corrida = self._corrida(estado=estado)
                respuesta = APIClient().delete(f"/api/literatura/corridas/{corrida.id}/")

                self.assertEqual(respuesta.status_code, 409)
                self.assertTrue(Corrida.objects.filter(pk=corrida.pk).exists())

    def test_corrida_activada_vuelve_a_la_is_de_la_tesis(self):
        corrida = self._corrida(activada=True)
        factor = Factor.objects.get(pk=1)
        factor.importancia_sugerida = 1
        factor.save(update_fields=["importancia_sugerida"])

        respuesta = APIClient().delete(f"/api/literatura/corridas/{corrida.id}/")

        self.assertEqual(respuesta.status_code, 204)
        self.assertFalse(Corrida.objects.filter(pk=corrida.pk).exists())
        for fila in TABLA_5_3:
            self.assertEqual(
                Factor.objects.get(pk=fila["id"]).importancia_sugerida,
                fila["is"],
            )

    def test_corrida_no_activada_no_toca_el_catalogo(self):
        factor = Factor.objects.get(pk=1)
        factor.importancia_sugerida = 1
        factor.save(update_fields=["importancia_sugerida"])
        corrida = self._corrida()

        respuesta = APIClient().delete(f"/api/literatura/corridas/{corrida.id}/")

        self.assertEqual(respuesta.status_code, 204)
        factor.refresh_from_db()
        self.assertEqual(factor.importancia_sugerida, 1)

    def test_eliminar_corrida_inexistente_devuelve_404(self):
        respuesta = APIClient().delete("/api/literatura/corridas/999999/")
        self.assertEqual(respuesta.status_code, 404)


class FuentesTest(SimpleTestCase):
    @override_settings(SCOPUS_API_KEY="clave", SCOPUS_INST_TOKEN="", SCOPUS_VIEW="COMPLETE")
    @patch("literatura.fuentes.requests.get")
    def test_scopus_reintenta_sin_view_si_no_esta_autorizada(self, get):
        sin_vista = Mock(status_code=401, text="not authorized to access the requested view")
        sin_vista.raise_for_status = Mock()
        basica = Mock(status_code=200, text="")
        basica.json.return_value = {"search-results": {"entry": []}}
        basica.raise_for_status = Mock()
        get.side_effect = [sin_vista, basica]

        list(fuentes.buscar_scopus(2020, 2025, lambda *args: None, 1))

        self.assertEqual(get.call_count, 2)
        self.assertIn("view", get.call_args_list[0].kwargs["params"])
        self.assertNotIn("view", get.call_args_list[1].kwargs["params"])

    def test_prefiltrar_sin_resumen_acepta_porque_la_consulta_ya_filtro(self):
        self.assertTrue(fuentes.prefiltrar("Critical review of microplastics pollution", ""))

    @override_settings(LIT_OPENALEX_MAILTO="codigo@universidad.edu")
    @patch("literatura.fuentes.time.sleep")
    @patch("literatura.fuentes.requests.get")
    def test_enriquece_resumen_vacio_desde_openalex_por_doi(self, get, dormir):
        fuentes.RESUMEN_OPENALEX_CACHE.clear()
        respuesta = Mock(status_code=200, text="")
        respuesta.json.return_value = {
            "results": [{"abstract_inverted_index": {"Community": [0], "support": [1]}}]
        }
        respuesta.raise_for_status = Mock()
        get.return_value = respuesta
        huella = fuentes.huella_articulo("Open source adoption", 2020, "10.1000/adopcion")
        articulo = {
            "huella": huella, "doi": "10.1000/adopcion", "titulo": "Open source adoption",
            "resumen": "", "revista": "", "anio": 2020, "fuente": "crossref",
            "url": "", "datos_crudos": {},
        }

        with patch.dict(fuentes.BUSCADORES, {"cruzada": lambda *args: iter([articulo])}):
            encontrados = list(fuentes.buscar(["cruzada"], 2020, 2020, lambda *args: None, 1))

        self.assertEqual(encontrados[0]["resumen"], "Community support")
        self.assertEqual(encontrados[0]["datos_crudos"]["resumen_enriquecido"], "openalex")
        self.assertEqual(get.call_args.kwargs["params"]["filter"], "doi:10.1000/adopcion")
        dormir.assert_called_once()
