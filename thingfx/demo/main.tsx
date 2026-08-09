import './mock.ts'

import React from 'react'
import ReactDOM from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'

import { ChannelContextProvider } from '@/contexts/ChannelContext.js'
import { DevModeContextProvider } from '@/contexts/DevModeContext.js'
import { ModalContextProvider } from '@/contexts/ModalContext.js'

import App from '@/App.js'

import '@/index.css'
import '@fontsource-variable/open-sans'
import '@fontsource/material-icons'

const page = new URLSearchParams(window.location.search).get('page') ?? '/'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MemoryRouter initialEntries={[page]}>
      <ChannelContextProvider>
        <DevModeContextProvider>
          <ModalContextProvider>
            <App />
          </ModalContextProvider>
        </DevModeContextProvider>
      </ChannelContextProvider>
    </MemoryRouter>
  </React.StrictMode>
)
