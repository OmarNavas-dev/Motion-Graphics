import {chooseConcept, visualHeadline} from './semantic-director.mjs';

// Reglas puras compartidas por la vista previa y la exportación.
// Nunca reemplazamos la imagen elegida por el usuario ni inventamos activos.
export const directMediaScene = (scene, project = {}) => {
  const style = scene.style || project.style || 'modern';
  const concept = chooseConcept(scene, project);
  const explicitFit = scene.imageFit;
  // «Auto» conserva TODO el arte, también cuando llega en formato cuadrado;
  // el fondo desenfocado integra los márgenes sin recortar personajes.
  const fit = explicitFit === 'cover' || explicitFit === 'contain' ? explicitFit : 'contain';
  const statement = String(scene.title || '').trim();
  const words = statement.split(/\s+/).filter(Boolean);
  const headline = words.length <= 7 ? visualHeadline(statement, 7) :
    concept.kind === 'immune' ? (concept.detail === 'skin' ? 'TU PIEL TE PROTEGE' :
      concept.detail === 'wash' ? 'MANOS LIMPIAS' : 'DEFENSAS AL RESCATE') :
    concept.kind === 'finance' ? 'DATOS QUE IMPORTAN' :
    concept.kind === 'horror' ? 'ALGO NO ESTÁ BIEN' :
    concept.kind === 'technology' ? 'TODO ESTÁ CONECTADO' :
    concept.kind === 'nature' ? 'UN MUNDO POR DESCUBRIR' :
    concept.kind === 'learning' ? 'DESCUBRE ALGO NUEVO' :
    'LA IDEA PRINCIPAL';
  return {style, fit, concept, headline, showText: project.showText === true};
};

// Una asignación explícita del usuario, sin repetir fotos arbitrariamente.
// Las escenas ya ilustradas o con clips de video no se tocan.
export const assignReferenceImages = (scenes, references) => {
  const alreadyUsed = new Set(scenes.map((scene) => scene.imageAsset).filter(Boolean));
  let index = 0;
  return scenes.map((scene) => {
    if (scene.imageAsset || scene.videoAsset) return scene;
    while (index < references.length && alreadyUsed.has(references[index])) index++;
    if (index >= references.length) return scene;
    const imageAsset = references[index++];
    alreadyUsed.add(imageAsset);
    return {...scene, imageAsset, approved: false};
  });
};
