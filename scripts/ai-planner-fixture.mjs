// Proyecto determinista mínimo para pruebas del planificador; sin contenido de usuario.
export const plannerFixture = {
  name: 'Fixture IA', format:'vertical', palette:'aurora', audioAsset:'', musicAsset:'',
  script:'', creativeBrief:'', style:'modern', visualEngine:'adaptive', resolution:'720p', fps:24,
  fontAsset:'', fontFamily:'', showText:true, characterMode:'new', references:[],
  narrationMode:'single', voiceClips:[],
  scenes:Array.from({length:5}, (_, index) => ({
    id:`fixture-${index+1}`, layout:'data', duration:4, title:`Escena ${index+1}`,
    subtitle:'', imageAsset:'', cues:[], scriptExcerpt:'', approved:false,
  })),
};
