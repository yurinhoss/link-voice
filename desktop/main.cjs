const {app,BrowserWindow,Menu,session,desktopCapturer,ipcMain,shell,dialog}=require('electron');
const path=require('node:path');
const {APP_URL,trustedApp,externalUrl,permitted,captureSelection}=require('./policy.cjs');
let mainWindow,picker,pendingCapture=null,captureBusy=false;
const locked=app.requestSingleInstanceLock();if(!locked)app.quit();
else{
 app.on('second-instance',()=>{if(mainWindow){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.show();mainWindow.focus();}});
 app.whenReady().then(createWindow).catch(error=>{dialog.showErrorBox('Link',error.message);app.quit();});
 app.on('window-all-closed',()=>app.quit());
}
function openExternal(url){if(externalUrl(url))shell.openExternal(url).catch(()=>{});}
function finishCapture(selection){const pending=pendingCapture;if(!pending)return;pendingCapture=null;const window=picker;picker=null;if(window&&!window.isDestroyed())window.close();try{pending.callback(!pending.frame||pending.frame.isDestroyed()?null:captureSelection(pending.sources,selection,pending.audioRequested));}catch{}}
async function pickDisplay(request,callback){
 if(captureBusy||!mainWindow||mainWindow.isDestroyed()||!trustedApp(request.securityOrigin)||request.frame!==mainWindow.webContents.mainFrame||!request.userGesture)return callback(null);
 captureBusy=true;let delivered=false;const finish=result=>{if(delivered)return;delivered=true;captureBusy=false;try{callback(result);}catch{}};
 try{
  const sources=await desktopCapturer.getSources({types:['screen','window'],thumbnailSize:{width:320,height:180},fetchWindowIcons:false});
  if(!sources.length||!mainWindow||mainWindow.isDestroyed()||request.frame.isDestroyed()||!trustedApp(request.frame.url))return finish(null);
  pendingCapture={callback:finish,sources,audioRequested:request.audioRequested,frame:request.frame};
  picker=new BrowserWindow({parent:mainWindow,modal:true,width:820,height:650,minWidth:480,minHeight:420,title:'Compartilhar tela — Link',backgroundColor:'#101014',autoHideMenuBar:true,icon:path.join(__dirname,'assets/icon.png'),webPreferences:{preload:path.join(__dirname,'picker-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  picker.webContents.setWindowOpenHandler(()=>({action:'deny'}));picker.webContents.on('will-navigate',event=>event.preventDefault());picker.on('closed',()=>{picker=null;finishCapture(null);});
  await picker.loadFile(path.join(__dirname,'picker.html'));
 }catch{finishCapture(null);finish(null);}
}
function createWindow(){
 app.setAppUserModelId('com.linkvoice.desktop');
 const ses=session.fromPartition('persist:link-desktop');
 ses.setPermissionCheckHandler((contents,permission,origin)=>contents===mainWindow?.webContents&&permitted(origin,permission));
 ses.setPermissionRequestHandler((contents,permission,callback,details)=>callback(contents===mainWindow?.webContents&&permitted(details.requestingUrl||contents.getURL(),permission)));
 ses.setDisplayMediaRequestHandler(pickDisplay);
 mainWindow=new BrowserWindow({width:1280,height:820,minWidth:420,minHeight:440,title:'Link',backgroundColor:'#080808',show:false,autoHideMenuBar:true,icon:path.join(__dirname,'assets/icon.png'),webPreferences:{session:ses,contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,backgroundThrottling:false}});
 Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Link',submenu:[{label:'Recarregar',accelerator:'Ctrl+R',click:()=>mainWindow?.loadURL(APP_URL).catch(showOffline)},{label:'Abrir no navegador',click:()=>openExternal(APP_URL)},{type:'separator'},{role:'quit',label:'Sair'}]},{label:'Visualização',submenu:[{role:'togglefullscreen',label:'Tela cheia'},{role:'resetZoom',label:'Tamanho original'},{role:'zoomIn',label:'Aumentar'},{role:'zoomOut',label:'Diminuir'}]}]));
 mainWindow.once('ready-to-show',()=>mainWindow.show());mainWindow.on('closed',()=>{finishCapture(null);mainWindow=null;});
 mainWindow.webContents.on('page-title-updated',event=>{event.preventDefault();mainWindow?.setTitle('Link');});
 mainWindow.webContents.setWindowOpenHandler(({url})=>{if(trustedApp(url))mainWindow.loadURL(url).catch(showOffline);else openExternal(url);return {action:'deny'};});
 mainWindow.webContents.on('will-navigate',(event,url)=>{if(!trustedApp(url)){event.preventDefault();openExternal(url);}});
 mainWindow.webContents.on('will-redirect',(event,url)=>{if(!trustedApp(url))event.preventDefault();});
 mainWindow.webContents.on('did-fail-load',(_event,code,_description,_url,isMainFrame)=>{if(isMainFrame&&code!==-3)showOffline();});
 mainWindow.loadURL(APP_URL).catch(showOffline);
}
function showOffline(){if(mainWindow&&!mainWindow.isDestroyed())mainWindow.loadFile(path.join(__dirname,'offline.html')).catch(()=>{});}
ipcMain.handle('capture:list',event=>{if(event.sender!==picker?.webContents||!pendingCapture)return [];return pendingCapture.sources.map(source=>({id:source.id,name:source.name,thumbnail:source.thumbnail.toDataURL(),audioAvailable:pendingCapture.audioRequested&&process.platform==='win32'}));});
ipcMain.handle('capture:choose',(event,selection)=>{if(event.sender===picker?.webContents)finishCapture(selection);});
ipcMain.handle('capture:cancel',event=>{if(event.sender===picker?.webContents)finishCapture(null);});
