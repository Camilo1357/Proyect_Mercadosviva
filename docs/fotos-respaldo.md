# Fotos de respaldo

Implementado el 28 de octubre de 2026. Las tarjetas sin foto o con una imagen que falla consultan `POST /api/tourism/photos` con ciudad y país. Este endpoint requiere la sesión del visitante, limita solicitudes y utiliza Wikimedia sin una clave adicional.

Primero busca la imagen seleccionada del artículo de la ciudad en Wikipedia en español, comprobando que el texto mencione el país. Obtiene el archivo, autor y licencia en Commons. Si no se puede resolver el artículo, busca archivos por ciudad y país y exige que el nombre de la ciudad aparezca en el título. Esta búsqueda no garantiza identificar la actividad concreta: todas las imágenes se etiquetan como referencia de la ciudad.

Se aceptan únicamente imágenes de hosts Wikimedia y licencias Creative Commons con autor y enlace verificables. Se excluyen mapas, banderas y logos por título. La atribución se muestra bajo la imagen, con enlace al archivo, licencia y aviso de recorte. Los metadatos se convierten a texto y se escapan antes de mostrarlos.

La carga es posterior a los resultados turísticos; no retrasa la respuesta de Exa/OpenAI. Consultas repetidas por ciudad se comparten en el navegador y se almacenan en una caché limitada del proceso. Si no hay una imagen apta o Wikimedia falla, permanece la ubicación sin foto. No se descargan URLs arbitrarias en el servidor.

Verificación: 21 pruebas automatizadas de búsqueda/fotos pasaron. Prueba en navegador con actividades de prueba y fotografías reales de Buenos Aires: imagen ausente y enlace original roto recuperaron una fotografía real con autor/licencia. Vista móvil de 390 px sin desbordamiento. No se consumió una búsqueda adicional de OpenAI/Exa para esta prueba de imágenes.
