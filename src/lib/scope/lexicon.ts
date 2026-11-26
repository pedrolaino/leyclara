// Everyday words vs. legal words ("me echaron" -> "despido"), area hints and uncovered topics.
// Patterns run on normalized text: lowercase, no accents.
import type { AreaId } from "@/config/laws";

export interface Expansion {
  area: AreaId;
  pattern: RegExp;
  terms: string;
}

export const EXPANSIONS: Expansion[] = [
  // trabajo
  { area: "trabajo", pattern: /\b(echaron|echan|echar|echo|rajaron|rajar|raje|desp(id|ed|ide)\w*)\b/, terms: "despido sin justa causa indemnizacion preaviso" },
  { area: "trabajo", pattern: /\b(en negro|no registrad[oa]|sin registrar|sin recibo|informal)\b/, terms: "registracion relacion laboral no registrada" },
  { area: "trabajo", pattern: /\b(avisar|aviso|avisarme|anticipacion)\b/, terms: "preaviso plazos" },
  { area: "trabajo", pattern: /\baguinaldo\b/, terms: "sueldo anual complementario" },
  { area: "trabajo", pattern: /\b(sueldo|salario|me pagan|pagaron|cobro el|cobrar el|plata)\b/, terms: "remuneracion pago" },
  { area: "trabajo", pattern: /\b(jefe|jefa|patron|patrona|empresa donde trabajo|encargado)\b/, terms: "empleador" },
  { area: "trabajo", pattern: /\b(renunciar|renuncio|renuncie|irme del trabajo)\b/, terms: "renuncia extincion" },
  { area: "trabajo", pattern: /\b(embarazada|embarazo|maternidad|bebe|parto)\b/, terms: "embarazo maternidad licencia" },
  { area: "trabajo", pattern: /\b(horas extras?|hora extra|trabajar de mas)\b/, terms: "horas suplementarias jornada" },
  { area: "trabajo", pattern: /\b(enferm[oa]|enfermedad|estoy enfermo|carpeta medica)\b/, terms: "enfermedad inculpable" },
  { area: "trabajo", pattern: /\b(prueba|me tomaron hace poco|recien entre|entre hace (un|una|dos|tres|cuatro|cinco|pocos|unos) (mes|meses|semanas?|dias)|hace (un|dos|tres|pocos) meses que trabajo)\b/, terms: "periodo de prueba" },
  { area: "trabajo", pattern: /\b(nacio mi hij[oa]|paternidad|soy padre|fui padre)\b/, terms: "nacimiento de hijo licencia especial" },
  { area: "trabajo", pattern: /\b(me caso|casamiento|casarme)\b/, terms: "matrimonio licencia especial" },
  { area: "trabajo", pattern: /\b(murio|fallecio|fallecimiento)\b/, terms: "fallecimiento licencia especial" },
  { area: "trabajo", pattern: /\b(examen|rendir|final de la facultad)\b/, terms: "examen licencia especial" },
  { area: "trabajo", pattern: /\b(cambiaron el horario|cambio de horario|cambiaron de puesto|me trasladan|cambio de lugar)\b/, terms: "modificacion condiciones de trabajo ius variandi" },
  { area: "trabajo", pattern: /\b(vacaciones)\b/, terms: "vacaciones licencia ordinaria" },
  { area: "trabajo", pattern: /\b(franco|descanso semanal|fin de semana|domingo|sabado)\b/, terms: "descanso semanal" },
  { area: "trabajo", pattern: /\b(feriados?)\b/, terms: "feriados nacionales dias no laborables" },
  { area: "trabajo", pattern: /\b(recibo de sueldo)\b/, terms: "recibo de pago remuneracion" },
  { area: "trabajo", pattern: /\b(certificado de trabajo|certificado laboral)\b/, terms: "certificado de trabajo entrega" },
  { area: "trabajo", pattern: /\b(cuantas horas|jornada|horario de trabajo)\b/, terms: "jornada de trabajo duracion" },
  { area: "trabajo", pattern: /\b(menor de edad|tengo 16|tengo 17|adolescente)\b/, terms: "trabajo adolescente" },
  { area: "trabajo", pattern: /\b(suspendieron|suspension|me suspendieron)\b/, terms: "suspension" },

  // consumo
  { area: "consumo", pattern: /\b(fallad[oa]s?|rot[oa]s?|romp\w*|rompi\w*|no anda|dejo de andar|no funciona|dejo de funcionar|defectuos[oa]s?|vino mal|con fallas?)\b/, terms: "defecto vicio garantia reparacion" },
  { area: "consumo", pattern: /\b(devolver|devolucion|arrepenti|arrepentirme|arrepentimiento|me arrepiento)\b/, terms: "revocacion aceptacion devolucion" },
  { area: "consumo", pattern: /\b(por internet|online|en linea|pagina web|app|por telefono|mercado libre|tienda virtual)\b/, terms: "venta por correspondencia medios electronicos a distancia" },
  { area: "consumo", pattern: /\b(dar de baja|darme de baja|la baja|cancelar el servicio|desuscribirme|no me dejan dar)\b/, terms: "rescision baja servicio modos de rescision" },
  { area: "consumo", pattern: /\b(me cobraron de mas|cobro de mas|cobro indebido|me cobran|me cobraron)\b/, terms: "cobro facturacion" },
  { area: "consumo", pattern: /\b(no se hacen? responsables?|no se responsabiliza\w*|deslinda\w*)\b/, terms: "clausulas limiten responsabilidad por danos" },
  { area: "consumo", pattern: /\b(lesion\w*|me lastim\w*|me herid\w*|me quem\w*|me electrocut\w*|accidente con el producto)\b/, terms: "dano vicio riesgo de la cosa responsabilidad" },
  { area: "consumo", pattern: /\b(compr\w*|lavarropas|heladera|televisor|tele|celular nuevo|electrodomestic\w*|zapatillas|ropa)\b/, terms: "consumidor proveedor cosas muebles" },
  { area: "consumo", pattern: /\b(no me (lo|la|los|las) entregaron|nunca llego|no llego|no me entregaron|no cumplieron)\b/, terms: "incumplimiento de la oferta del contrato" },
  { area: "consumo", pattern: /\b(publicidad|publicitad\w*|propaganda|anunci\w*|promocion|oferta)\b/, terms: "publicidad oferta" },
  { area: "consumo", pattern: /\b(me atendieron mal|maltrato|me trataron mal|destrato|me hicieron esperar)\b/, terms: "trato digno practicas abusivas" },
  { area: "consumo", pattern: /\b(factura|ticket|comprobante)\b/, terms: "documento de venta factura" },
  { area: "consumo", pattern: /\b(tarjeta de credito|cuotas|prestamo|credito|financiacion|interes)\b/, terms: "operaciones de credito financiacion" },
  { area: "consumo", pattern: /\b(letra chica|clausula|contrato que firme)\b/, terms: "clausulas abusivas contrato de adhesion" },
  { area: "consumo", pattern: /\b(garantia)\b/, terms: "garantia cosas muebles" },
  { area: "consumo", pattern: /\b(service|servicio tecnico|reparacion|arreglo|arreglar)\b/, terms: "servicio tecnico reparacion" },
  { area: "consumo", pattern: /\b(luz|gas|agua|internet|telefonia|celular|cable)\b.*\b(corte|cortaron|factura|boleta|cobro)\b|\b(corte|cortaron)\b.*\b(luz|gas|agua|internet)\b/, terms: "servicios publicos domiciliarios interrupcion facturacion" },
  { area: "consumo", pattern: /\b(precio|cartel|gondola)\b/, terms: "precio oferta informacion" },

  // transito
  { area: "transito", pattern: /\b(auto|coche|camioneta|moto|motocicleta|vehiculo|camion)\b/, terms: "automotor vehiculo" },
  { area: "transito", pattern: /\b(registro de conducir|carnet|carne|licencia de conducir|registro)\b/, terms: "licencia de conducir" },
  { area: "transito", pattern: /\b(multa|multaron|infraccion|fotomulta|acta)\b/, terms: "multa sancion falta" },
  { area: "transito", pattern: /\b(control|me pararon|operativo|retener|retuvieron|secuestr\w*|grua|corralon|me sacaron)\b/, terms: "retencion preventiva control autoridad" },
  { area: "transito", pattern: /\b(cerveza|alcohol|alcoholemia|tome|tomar|vino|borracho|fernet|trago|alcoholizado)\b/, terms: "alcohol alcoholemia conducir" },
  { area: "transito", pattern: /\b(velocidad|rapido|km h|kilometros por hora|maxima)\b/, terms: "velocidad maxima limites" },
  { area: "transito", pattern: /\b(seguro)\b/, terms: "seguro obligatorio" },
  { area: "transito", pattern: /\b(vtv|verificacion tecnica|rto)\b/, terms: "revision tecnica obligatoria" },
  { area: "transito", pattern: /\b(papeles|documentos|documentacion|cedula verde|cedula azul|cedula)\b/, terms: "documentacion requisitos para circular cedula de identificacion" },
  { area: "transito", pattern: /\b(choque|choque|chocaron|choco|accidente de transito|me chocaron)\b/, terms: "accidente de transito obligaciones" },
  { area: "transito", pattern: /\b(celular|telefono|whatsapp)\b.*\b(manejando|manejar|conducir)\b|\b(manejando|manejar)\b.*\b(celular|telefono)\b/, terms: "prohibiciones conducir telefono celular" },
  { area: "transito", pattern: /\b(casco|cinturon|silla para el bebe|sillita)\b/, terms: "condiciones para conducir casco cinturon de seguridad" },
  { area: "transito", pattern: /\b(estacionar|estacionado|estacionamiento|doble fila)\b/, terms: "estacionamiento" },
  { area: "transito", pattern: /\b(semaforo|luz roja|semaforo en rojo)\b/, terms: "vias semaforizadas" },
  { area: "transito", pattern: /\b(peaton|peatones|cruzar la calle|senda peatonal)\b/, terms: "peatones" },
  { area: "transito", pattern: /\b(bici|bicicleta|ciclista|monopatin)\b/, terms: "bicicletas requisitos para circular" },
  { area: "transito", pattern: /\b(a que edad|edad para manejar|edad minima)\b/, terms: "edades minimas para conducir" },
  { area: "transito", pattern: /\b(manejar|maneje|manejo|conducir|conduzco)\b/, terms: "conducir conductor" },
  { area: "transito", pattern: /\b(adelantar|pasar a otro auto|sobrepaso)\b/, terms: "adelantamiento" },
  { area: "transito", pattern: /\b(luces|luz baja|luces bajas)\b/, terms: "uso de las luces" },
  { area: "transito", pattern: /\b(ruta|autopista|autovia)\b/, terms: "autopistas rutas zona rural" },
];

export const AREA_HINTS: Record<AreaId, RegExp> = {
  trabajo: /\b(trabaj\w*|emplead\w*|empleador\w*|laboral\w*|despid\w*|indemnizacion|licencias?|vacaciones|aguinaldo|sueldo|salario|preaviso|convenio|sindicato|antiguedad|remuneracion|jornada|horas extras?)\b/,
  consumo: /\b(compr\w*|vend\w*|producto|consumidor|tienda|negocio|local|garantia|proveedor|servicio|factura|reclamo|devol\w*|precio)\b/,
  transito: /\b(transito|manej\w*|conduc\w*|auto|moto|multa|licencia de conducir|registro|ruta|calle|velocidad|control|alcoholemia|estacion\w*|semaforo|peaton)\b/,
};

export interface UncoveredTopic {
  id: string;
  label: string;
  pattern: RegExp;
  whereRegulated: string;
  whereToAsk: string;
  // Always rejected, even if the question sounds like a covered area.
  // E.g. domestic workers: the LCT excludes them in art. 2.
  exclusive?: boolean;
}

export const UNCOVERED_TOPICS: UncoveredTopic[] = [
  {
    id: "alquileres",
    label: "alquileres",
    pattern: /\b(alquiler\w*|alquil[oa]|inquilin\w*|locador|locatari\w*|propietario del departamento|dueno del departamento|desalojo|expensas|deposito de garantia)\b/,
    whereRegulated:
      "Los alquileres se rigen por el Código Civil y Comercial de la Nación (contrato de locación). La Ley de Alquileres 27.551 fue derogada a fines de 2023.",
    whereToAsk:
      "Podés consultar en la Defensoría del Pueblo de tu ciudad o provincia, o pedir patrocinio jurídico gratuito en el colegio de abogados de tu zona.",
  },
  {
    id: "familia",
    label: "familia (divorcio, alimentos, cuidado de hijos)",
    pattern: /\b(divorci\w*|cuota alimentaria|alimentos para mis hijos|tenencia|regimen de comunicacion|custodia|adopcion|separarme|mi ex)\b/,
    whereRegulated: "Los temas de familia se rigen por el Código Civil y Comercial de la Nación.",
    whereToAsk:
      "Podés acudir a una defensoría oficial o a los servicios de patrocinio jurídico gratuito de tu provincia o del colegio de abogados.",
  },
  {
    id: "sucesiones",
    label: "herencias y sucesiones",
    pattern: /\b(herencia|heredar|heredero\w*|sucesion|testamento)\b/,
    whereRegulated: "Las herencias y sucesiones se rigen por el Código Civil y Comercial de la Nación.",
    whereToAsk: "Lo recomendable es consultar con un abogado o un escribano.",
  },
  {
    id: "jubilaciones",
    label: "jubilaciones, pensiones y asignaciones",
    pattern: /\b(jubil\w*|pension\w*|anses|auh|asignacion universal|asignaciones familiares|aportes jubilatorios)\b/,
    whereRegulated: "Las jubilaciones y asignaciones se rigen por la normativa de la seguridad social (por ejemplo, la Ley 24.241).",
    whereToAsk: "Podés consultar en ANSES o con un abogado previsionalista.",
  },
  {
    id: "impuestos",
    label: "impuestos",
    pattern: /\b(impuesto\w*|ganancias|monotribut\w*|afip|arca|iva|ingresos brutos|facturar como)\b/,
    whereRegulated: "Los impuestos se rigen por leyes tributarias específicas, nacionales, provinciales y municipales.",
    whereToAsk: "Podés consultar en ARCA (ex AFIP), en el organismo de rentas de tu provincia o con un contador.",
  },
  {
    id: "riesgos-trabajo",
    exclusive: true,
    label: "accidentes de trabajo y ART",
    pattern: /\b(accidente (de trabajo|laboral|en el trabajo)|me accidente trabajando|riesgos del trabajo|aseguradora de riesgos|la art|enfermedad profesional)\b/,
    whereRegulated:
      "Los accidentes de trabajo y las enfermedades profesionales se rigen por la Ley de Riesgos del Trabajo (24.557), no por la Ley de Contrato de Trabajo.",
    whereToAsk: "Podés consultar en la Superintendencia de Riesgos del Trabajo (SRT) o con un abogado laboralista.",
  },
  {
    id: "casas-particulares",
    exclusive: true,
    label: "trabajo en casas particulares",
    pattern: /\b(empleada domestica|empleado domestico|servicio domestico|casas particulares|niñera|ninera|trabajo en una casa de familia|personal domestico)\b/,
    whereRegulated:
      "El trabajo en casas particulares tiene un régimen propio (Ley 26.844); la Ley de Contrato de Trabajo lo excluye expresamente en su artículo 2.",
    whereToAsk: "Podés consultar a la autoridad laboral de tu jurisdicción o con un abogado laboralista.",
  },
  {
    id: "empleo-publico",
    exclusive: true,
    label: "empleo público",
    pattern: /\b(empleado publico|empleada publica|trabajo en el estado|planta permanente|municipalidad me|soy estatal)\b/,
    whereRegulated:
      "El empleo público tiene regímenes propios (nacional, provincial o municipal); la Ley de Contrato de Trabajo no se aplica salvo que se lo incluya expresamente.",
    whereToAsk: "Podés consultar con tu gremio, el área de recursos humanos del organismo o un abogado.",
  },
  {
    id: "penal",
    label: "delitos y denuncias penales",
    pattern: /\b(me robaron|robo|hurto|denuncia penal|delito|me estafaron|estafa|me pegaron|amenaz\w*|violencia de genero|violencia familiar)\b/,
    whereRegulated: "Los delitos se rigen por el Código Penal de la Nación.",
    whereToAsk:
      "Podés hacer la denuncia en una comisaría o fiscalía. En una emergencia llamá al 911; por violencia de género, a la Línea 144.",
  },
];
