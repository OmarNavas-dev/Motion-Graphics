async function bounded(operation,ms,label){
 let timer;
 try{return await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label)),ms);})]);}
 finally{clearTimeout(timer);}
}

// Same private renderer launch mode as Remotion/HyperFrames in the Windows
// container. No system/browser settings are changed. The review server uses CSP
// to limit this process to its generated composition and whitelisted local assets.
export const renderBrowserArgs=()=>['--no-sandbox','--disable-setuid-sandbox','--disable-gpu'];

// End only the process created for this review, never a desktop browser.
export async function closeRenderBrowser(browser){
 if(!browser)return;
 if(typeof browser.process==='function'){
  const owned=browser.process();
  const exited=()=>{
    if(!owned)return false;
    if(owned.exitCode!=null || owned.signalCode!=null)return true;
    // Windows may dispose the native process before delivering the exit event.
    try{process.kill(owned.pid,0);}catch(error){if(error.code==='ESRCH')return true;}
    return false;
  };
  let processError;
  const recordError=error=>{processError=error;};
  owned?.on?.('error',recordError);
  try{
    if(browser.pages){
      const pages=await bounded(browser.pages(),5000,'No se pudieron enumerar las páginas privadas.');
      await bounded(Promise.all(pages.map(page=>page.close({runBeforeUnload:false}))),5000,'Las páginas privadas no respondieron al cierre.');
    }
    await bounded(browser.close(),10000,'El navegador privado no respondió al cierre.');
  }
  catch(error){
    if(!owned)throw error;
    if(exited())return;
    const stopped=new Promise(resolve=>owned.once('exit',resolve));
    if(!owned.kill('SIGKILL') && !exited())throw Error('No se pudo detener el proceso privado de revisión: '+(processError?.code||'sin señal de salida')+' (pid '+owned.pid+').');
    if(!exited())await bounded(stopped,15000,'No se pudo finalizar el navegador privado de revisión: '+(processError?.code||'sin señal de salida')+'.');
  }finally{
    await browser.disconnect();
    owned?.unref();
    owned?.off?.('error',recordError);
  }
  return;
 }
 throw Error('El revisor requiere un navegador privado con control de su proceso.');
}
