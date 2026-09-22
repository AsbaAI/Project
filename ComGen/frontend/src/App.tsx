import { useState } from 'react'
import { AppShell, NavItem } from './components/layout'
import { ThemeProvider } from './components/ThemeProvider'
import { Badge, ThemeToggle } from './components/ui'
import { IconLayers, IconSliders, IconSparks } from './components/icons'
import { Components } from './pages/Components'
import { Foundations } from './pages/Foundations'
import { Workspace } from './pages/Workspace'
import styles from './App.module.css'

type Ecran = 'atelier' | 'fondations' | 'composants'

export default function App() {
  const [ecran, setEcran] = useState<Ecran>('atelier')

  return (
    <ThemeProvider>
      <AppShell
        brand={
          <>
            <span className={styles.mark} aria-hidden="true">
              CG
            </span>
            <span className={styles.name}>ComGen</span>
            <Badge>Aperçu</Badge>
          </>
        }
        headerActions={<ThemeToggle />}
        sidebar={
          <>
            <NavItem
              label="Atelier"
              icon={<IconSparks />}
              current={ecran === 'atelier'}
              onClick={() => setEcran('atelier')}
            />
            <NavItem
              label="Fondations"
              icon={<IconLayers />}
              current={ecran === 'fondations'}
              onClick={() => setEcran('fondations')}
            />
            <NavItem
              label="Composants"
              icon={<IconSliders />}
              current={ecran === 'composants'}
              onClick={() => setEcran('composants')}
            />
          </>
        }
      >
        {ecran === 'atelier' && <Workspace />}
        {ecran === 'fondations' && <Foundations />}
        {ecran === 'composants' && <Components />}
      </AppShell>
    </ThemeProvider>
  )
}
