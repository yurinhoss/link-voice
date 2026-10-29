const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('capturePicker',{list:()=>ipcRenderer.invoke('capture:list'),choose:selection=>ipcRenderer.invoke('capture:choose',selection),cancel:()=>ipcRenderer.invoke('capture:cancel')});
