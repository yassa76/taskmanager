// Novità della piattaforma, dalla più recente alla più vecchia. Scritte per chi usa l'app.
// DA AGGIORNARE a ogni rilascio: si aggiunge una voce IN CIMA all'elenco.
// `id` unico e crescente; `date` come AAAA-MM-GG (per le voci storiche basta AAAA-MM).

export interface ChangelogEntry {
  id: string
  date: string
  title: string
  description: string
  tag: 'novità' | 'miglioramento' | 'correzione'
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: '2026-11-27-dettaglio-task',
    date: '2026-11-27',
    title: 'Dettaglio task: stato a passaggi e modifica rapida',
    description:
      'Nella pagina del task trovi la barra Da avviare, In corso, Completato su cui cliccare per cambiare stato, e puoi cambiare owner e scadenza direttamente dai campi in evidenza, senza aprire la modifica.',
    tag: 'novità'
  },
  {
    id: '2026-11-27-nuovo-aspetto',
    date: '2026-11-27',
    title: 'Nuovo aspetto e barra in basso su telefono',
    description:
      'Carattere, spazi e ombre più curati, barra in alto bianca con il colore del tuo tema come accento. Su telefono e tablet c\'è una barra in basso con Home, Task, Clienti, Report e Altro. Il tema colore si sceglie sempre dal profilo.',
    tag: 'miglioramento'
  },
  {
    id: '2026-11-27-esporta',
    date: '2026-11-27',
    title: 'Menu Opzioni delle tabelle: colonne ed esportazione',
    description:
      'Da computer, sopra le tabelle principali trovi il pulsante "Opzioni": da lì scegli le colonne da vedere oppure esporti i dati in Excel o CSV, decidendo righe, colonne e intestazioni. Nelle Notifiche del profilo, le schede mostrano ora quante notifiche ci sono e quante sono da leggere.',
    tag: 'miglioramento'
  },
  {
    id: '2026-11-26-mobile-colonne',
    date: '2026-11-26',
    title: 'Uso da telefono e tablet, colonne personalizzabili',
    description:
      'La piattaforma ora si usa meglio da telefono e tablet: menu a tendina, modali a tutto schermo e, su telefono, le tabelle diventano schede. Da computer, nelle tabelle principali puoi scegliere quali colonne vedere e in che ordine: trascina le intestazioni, cliccale con il tasto destro per nasconderle o per aprire "Mostra colonne…" (trovi anche il pulsante "⚙ Colonne"). La scelta è tua e ti segue su ogni dispositivo; su telefono e tablet le colonne non si modificano.',
    tag: 'miglioramento'
  },
  {
    id: '2026-11-25-approvazione-accessi',
    date: '2026-11-25',
    title: 'Approvazione dei nuovi accessi',
    description:
      'Chi accede per la prima volta senza essere nel Team non entra più subito: la sua richiesta resta "in attesa" finché un amministratore non la approva dalla pagina Team. Gli amministratori ricevono una notifica.',
    tag: 'novità'
  },
  {
    id: '2026-11-25-novita',
    date: '2026-11-25',
    title: 'Pagina Novità',
    description: 'Qui trovi cosa è cambiato nella piattaforma e quando. Un pallino ti avvisa quando c\'è qualcosa che non hai ancora letto.',
    tag: 'novità'
  },
  {
    id: '2026-11-25-notifiche',
    date: '2026-11-25',
    title: 'Notifiche più ricche',
    description:
      'Oltre alle menzioni, ricevi un avviso quando ti viene assegnato un task o un sub-task, quando un altro cambia una tua scadenza e quando un tuo sub-task sta per scadere o è in ritardo. La campanella ha due schede (Menzioni e Altro). Le notifiche complete, e quali ricevere, sono nel tuo profilo.',
    tag: 'novità'
  },
  {
    id: '2026-11-25-ricorrenza-creazione',
    date: '2026-11-25',
    title: 'Sub-task ricorrenti già dalla creazione del task',
    description: 'Nel modulo "Nuovo task" puoi indicare per ogni sub-task se si ripete e ogni quanto.',
    tag: 'miglioramento'
  },
  {
    id: '2026-11-25-admin',
    date: '2026-11-25',
    title: 'Area Admin: paesi, registro modifiche e registro accessi',
    description:
      'Gli amministratori gestiscono i paesi disponibili per i clienti e consultano chi ha modificato cosa e chi si è collegato. I registri si ripuliscono in automatico dopo il periodo scelto (di default 90 giorni).',
    tag: 'novità'
  },
  {
    id: '2026-11-25-report',
    date: '2026-11-25',
    title: 'Report più chiari e cliccabili',
    description:
      'I box e i grafici dei Report aprono la lista filtrata corrispondente. Nuovo indicatore "Task attivi", coerente con Home e lista task. I grafici mostrano di default solo il lavoro aperto e la legenda segue il filtro "mostra completati".',
    tag: 'miglioramento'
  },
  {
    id: '2026-11-25-home-scope',
    date: '2026-11-25',
    title: 'Correzione: "Task del team" in Home e Report',
    description: 'Tornando sulla pagina i numeri erano quelli personali anche con "Task del team" selezionato. Ora restano coerenti con la scelta.',
    tag: 'correzione'
  },
  {
    id: '2026-11-commenti',
    date: '2026-11',
    title: 'Commenti e menzioni',
    description:
      'Su task e sub-task puoi scrivere commenti e menzionare i colleghi con @: chi viene menzionato riceve un avviso sulla campanella. Anche chi è in sola lettura può commentare.',
    tag: 'novità'
  },
  {
    id: '2026-11-subtask-ricorrenti',
    date: '2026-11',
    title: 'Sub-task ricorrenti',
    description:
      'Un sub-task può ripetersi (ogni settimana, mese, anno...): quando lo chiudi, la piattaforma crea il successivo con le date spostate in avanti. Nelle liste i sub-task ricorrenti sono riconoscibili dall\'icona 🔁.',
    tag: 'novità'
  },
  {
    id: '2026-11-home-clienti',
    date: '2026-11',
    title: 'Home rinnovata e clienti sulla mappa',
    description:
      'La Home è più compatta, con calendario e indicatori cliccabili affiancati. I clienti hanno paese, regione e città, e puoi vederli su una mappa dell\'Italia con il numero di clienti per regione.',
    tag: 'novità'
  }
]

export function formatChangelogDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  if (!d) return new Date(y, m - 1, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  return new Date(y, m - 1, d).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Quante voci sono piu' recenti dell'ultima vista dalla persona (tutte, se non ne ha mai vista una). */
export function unreadChangelogCount(seenId: string | null | undefined): number {
  if (!seenId) return CHANGELOG.length
  const i = CHANGELOG.findIndex((e) => e.id === seenId)
  return i === -1 ? CHANGELOG.length : i
}
