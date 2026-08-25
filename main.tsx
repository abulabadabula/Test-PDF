import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
// import { configureStore } from '@reduxjs/toolkit'
import { store } from './app/store' 
import App from './App.tsx'
import './index.css' // 确保创建此文件并写入 @import "tailwindcss";

// 轻量级 Store 配置，按需添加 reducer
// const store = configureStore({
//   reducer: {
//     // pdfViewer: pdfViewerReducer,
//     // drawing: drawingReducer,
//     // layers: layersReducer,
//   },
// })

// export type RootState = ReturnType<typeof store.getState>
// export type AppDispatch = typeof store.dispatch

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
)