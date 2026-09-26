// Lotería de matrimonios — "Adivina a tu pareja".
//
// Cada matrimonio comparte una tabla. Al cantar una carta, a uno le toca
// escribir su respuesta en secreto y al otro decir en voz alta qué cree que
// escribió: la casilla sólo se marca si le atinó. Por eso las preguntas están
// escritas para tener UNA respuesta concreta y adivinable — "¿qué se te antoja
// a media noche?" se puede adivinar; "cuenten cómo fue su primera cita" no.
//
//   name   — lo que cabe en la casilla y lo que se canta
//   prompt — la pregunta, dirigida a quien escribe
//   kind   — 'guess' se adivina; 'reto' se hace y se marca al terminarlo
//   nivel  — 'ligero' entra siempre; 'profundo' sólo si el moderador lo pide
//
// El orden no importa (las cartas se cantan al azar), pero el nivel sí: una
// reunión casual no debería abrir preguntando por la herida que no han hablado.
export const MATRIMONIOS = [
  // ── Ligero · se adivina ────────────────────────────────────────────────────
  { id: 1,  name: 'El Antojo',      emoji: '🍕', kind: 'guess', nivel: 'ligero',   prompt: '¿Qué se te antoja a media noche cuando nadie te ve?' },
  { id: 2,  name: 'La Canción',     emoji: '🎵', kind: 'guess', nivel: 'ligero',   prompt: '¿Qué canción cantas a todo volumen cuando vas solo/a en el coche?' },
  { id: 3,  name: 'El Apodo',       emoji: '🏷️', kind: 'guess', nivel: 'ligero',   prompt: '¿Cómo le dices de cariño a tu pareja cuando nadie los oye?' },
  { id: 4,  name: 'La Primera Vez', emoji: '🌹', kind: 'guess', nivel: 'ligero',   prompt: '¿Qué fue lo primero que pensaste de tu pareja cuando la viste?' },
  { id: 5,  name: 'La Manía',       emoji: '🤨', kind: 'guess', nivel: 'ligero',   prompt: '¿Qué manía tuya crees que a tu pareja le da más risa?' },
  { id: 6,  name: 'El Desayuno',    emoji: '🍳', kind: 'guess', nivel: 'ligero',   prompt: '¿Cuál sería tu desayuno perfecto un domingo?' },
  { id: 7,  name: 'La Serie',       emoji: '📺', kind: 'guess', nivel: 'ligero',   prompt: '¿Qué serie o película podrías ver mil veces?' },
  { id: 8,  name: 'El Viaje',       emoji: '✈️', kind: 'guess', nivel: 'ligero',   prompt: 'Si mañana pudieran irse a cualquier lugar, ¿a dónde?' },
  { id: 9,  name: 'La Compra',      emoji: '🛍️', kind: 'guess', nivel: 'ligero',   prompt: '¿Cuál es la compra más inútil que has hecho?' },
  { id: 10, name: 'El Miedo Tonto', emoji: '🕷️', kind: 'guess', nivel: 'ligero',   prompt: '¿A qué le tienes miedo aunque sepas que es ridículo?' },
  { id: 11, name: 'El Regalo',      emoji: '🎁', kind: 'guess', nivel: 'ligero',   prompt: '¿Cuál es el mejor regalo que te han dado en la vida?' },
  { id: 12, name: 'La Foto',        emoji: '📷', kind: 'guess', nivel: 'ligero',   prompt: '¿Cuál es tu foto favorita de los dos?' },
  { id: 13, name: 'El Sábado',      emoji: '🌤️', kind: 'guess', nivel: 'ligero',   prompt: '¿Cómo sería tu sábado ideal?' },
  { id: 14, name: 'El Talento',     emoji: '🎩', kind: 'guess', nivel: 'ligero',   prompt: '¿Qué haces mejor que casi todos y casi nadie sabe?' },
  { id: 15, name: 'La Comida',      emoji: '🍽️', kind: 'guess', nivel: 'ligero',   prompt: '¿Cuál es el platillo que más te gusta que cocinen en casa?' },
  { id: 16, name: 'El Desorden',    emoji: '🧦', kind: 'guess', nivel: 'ligero',   prompt: '¿Qué desorden de tu pareja te saca más de quicio?' },
  { id: 17, name: 'La Mañana',      emoji: '☕', kind: 'guess', nivel: 'ligero',   prompt: '¿Qué es lo primero que haces al despertar?' },
  { id: 18, name: 'El Corajito',    emoji: '😤', kind: 'guess', nivel: 'ligero',   prompt: '¿Qué cosa pequeña te pone de mal humor al instante?' },
  { id: 19, name: 'La Risa',        emoji: '😂', kind: 'guess', nivel: 'ligero',   prompt: '¿Cuál es el recuerdo de los dos que todavía te hace reír?' },
  { id: 20, name: 'El Día Libre',   emoji: '🌙', kind: 'guess', nivel: 'ligero',   prompt: '¿Qué harías con un día entero para ti solo/a?' },
  { id: 21, name: 'El Baile',       emoji: '💃', kind: 'guess', nivel: 'ligero',   prompt: '¿Con qué canción sacarías a bailar a tu pareja?' },
  { id: 22, name: 'El Súper',       emoji: '🛒', kind: 'guess', nivel: 'ligero',   prompt: '¿Qué se te olvida siempre cuando vas al súper?' },
  { id: 23, name: 'El Celular',     emoji: '📱', kind: 'guess', nivel: 'ligero',   prompt: '¿Cuántas horas al día crees que pasas en el celular?' },
  { id: 24, name: 'La Costumbre',   emoji: '🔁', kind: 'guess', nivel: 'ligero',   prompt: '¿Qué costumbre de pareja extrañas de cuando empezaban?' },
  { id: 25, name: 'El Cumplido',    emoji: '💬', kind: 'guess', nivel: 'ligero',   prompt: '¿Qué cumplido te encanta que te digan?' },
  { id: 26, name: 'El Domingo',     emoji: '🛋️', kind: 'guess', nivel: 'ligero',   prompt: '¿Prefieres salir o quedarse en casa?' },
  { id: 27, name: 'El Volante',     emoji: '🚗', kind: 'guess', nivel: 'ligero',   prompt: 'De los dos, ¿quién maneja mejor? Contesta la verdad.' },
  { id: 28, name: 'La Suerte',      emoji: '🍀', kind: 'guess', nivel: 'ligero',   prompt: 'Si se sacaran la lotería mañana, ¿en qué gastarías lo primero?' },

  // ── Ligero · retos ─────────────────────────────────────────────────────────
  { id: 29, name: 'El Abrazo',      emoji: '🤗', kind: 'reto',  nivel: 'ligero',   prompt: 'Abrácense veinte segundos sin decir nada. Cuéntenlos en voz alta.' },
  { id: 30, name: 'El Piropo',      emoji: '🌷', kind: 'reto',  nivel: 'ligero',   prompt: 'Dile a tu pareja tres cosas que te gustan de ella, viéndola a los ojos.' },
  { id: 31, name: 'La Selfie',      emoji: '🤳', kind: 'reto',  nivel: 'ligero',   prompt: 'Tómense una selfie haciendo la cara más ridícula que puedan.' },
  { id: 32, name: 'El Imitador',    emoji: '🎭', kind: 'reto',  nivel: 'ligero',   prompt: 'Imita a tu pareja diciendo su frase de siempre. Que la mesa adivine cuál es.' },

  // ── Profundo · se adivina ──────────────────────────────────────────────────
  { id: 33, name: 'El Orgullo',     emoji: '🏅', kind: 'guess', nivel: 'profundo', prompt: '¿De qué logro de tu pareja te sientes más orgulloso/a?' },
  { id: 34, name: 'La Admiración',  emoji: '⭐', kind: 'guess', nivel: 'profundo', prompt: '¿Qué admiras de tu pareja que nunca le has dicho con esas palabras?' },
  { id: 35, name: 'El Gracias',     emoji: '🙏', kind: 'guess', nivel: 'profundo', prompt: '¿Qué le agradeces a tu pareja de este último año?' },
  { id: 36, name: 'El Dinero',      emoji: '💵', kind: 'guess', nivel: 'profundo', prompt: '¿Cuál es el gasto de la casa que más te preocupa?' },
  { id: 37, name: 'El Tiempo',      emoji: '⏳', kind: 'guess', nivel: 'profundo', prompt: '¿Qué les está robando más tiempo de pareja hoy?' },
  { id: 38, name: 'La Rutina',      emoji: '⚙️', kind: 'guess', nivel: 'profundo', prompt: '¿Qué parte de su rutina te gustaría cambiar?' },
  { id: 39, name: 'El Trabajo',     emoji: '💼', kind: 'guess', nivel: 'profundo', prompt: '¿Qué es lo que más te cansa de tu semana?' },
  { id: 40, name: 'Los Hijos',      emoji: '👶', kind: 'guess', nivel: 'profundo', prompt: '¿Qué es lo más difícil de criar juntos?' },
  { id: 41, name: 'Los Suegros',    emoji: '🏡', kind: 'guess', nivel: 'profundo', prompt: '¿Qué tema con la familia les falta platicar con calma?' },
  { id: 42, name: 'El Silencio',    emoji: '🤐', kind: 'guess', nivel: 'profundo', prompt: '¿De qué tema te cuesta más trabajo hablar con tu pareja?' },
  { id: 43, name: 'La Herida',      emoji: '🩹', kind: 'guess', nivel: 'profundo', prompt: '¿Hay algo del pasado que todavía te duele?' },
  { id: 44, name: 'El Perdón',      emoji: '🕊️', kind: 'guess', nivel: 'profundo', prompt: '¿Por qué le pedirías perdón a tu pareja hoy?' },
  { id: 45, name: 'El Miedo',       emoji: '😨', kind: 'guess', nivel: 'profundo', prompt: '¿Cuál es tu miedo más grande hoy?' },
  { id: 46, name: 'La Soledad',     emoji: '🫥', kind: 'guess', nivel: 'profundo', prompt: '¿Cuándo fue la última vez que te sentiste solo/a estando acompañado/a?' },
  { id: 47, name: 'El Sueño',       emoji: '🌠', kind: 'guess', nivel: 'profundo', prompt: '¿Qué sueñas para los dos dentro de cinco años?' },
  { id: 48, name: 'La Fe',          emoji: '✝️', kind: 'guess', nivel: 'profundo', prompt: '¿Qué le pides a Dios para su matrimonio?' },
  { id: 49, name: 'El Lenguaje',    emoji: '❤️', kind: 'guess', nivel: 'profundo', prompt: '¿Cómo prefieres que te demuestren amor: palabras, tiempo, detalles, ayuda o abrazos?' },
  { id: 50, name: 'La Ayuda',       emoji: '🤝', kind: 'guess', nivel: 'profundo', prompt: '¿En qué te gustaría que tu pareja te ayudara más?' },
  { id: 51, name: 'El Cambio',      emoji: '🔄', kind: 'guess', nivel: 'profundo', prompt: '¿Qué cosa tuya te gustaría cambiar por el bien de los dos?' },

  // ── Profundo · retos ───────────────────────────────────────────────────────
  { id: 52, name: 'Las Paces',      emoji: '🤍', kind: 'reto',  nivel: 'profundo', prompt: 'Si traen algo pendiente, pídanse perdón ahora, en corto y en voz baja.' },
  { id: 53, name: 'La Oración',     emoji: '🙏', kind: 'reto',  nivel: 'profundo', prompt: 'Tómense de las manos y oren uno por el otro en voz alta.' },
  { id: 54, name: 'La Promesa',     emoji: '📜', kind: 'reto',  nivel: 'profundo', prompt: 'Prométanle algo concreto al otro para esta semana. Que la mesa sea testigo.' },
]
