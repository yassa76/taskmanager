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
    id: '2026-11-27-viste-uniformi',
    date: '2026-11-27',
    title: 'Tendina delle viste uguale ovunque',
    description:
      'Il menu delle viste (i miei record, del team, tutti, le tue viste) ha la stessa larghezza in Home, Task, Clienti e Report. Nel profilo i pulsanti Estesa e Compatta hanno la stessa dimensione.',
    tag: 'miglioramento'
  },
  {
    id: '2026-11-27-icone-tema-margini',
    date: '2026-11-27',
    title: 'Icone nel colore del tema, margini ridotti, stati a frecce',
    description:
      'Al posto dei quadratini bianchi ci sono vere icone (owner, scadenza, notifiche, pulsanti) nel colore del tema scelto nel profilo. Lo spazio ai lati delle pagine è ridotto: i contenuti usano tutta la larghezza, come in Salesforce. Il percorso degli stati ora è a frecce contigue. I pulsanti di creazione si chiamano tutti "+ Nuovo" (il tooltip dice cosa creano). Sui pulsanti e sui campi cliccabili il cursore diventa una manina. Menu a tendina con freccia nitida, icone dei pulsanti nel colore del tema, testi della Home più leggibili.',
    tag: 'miglioramento'
  },
  {
    id: '2026-11-27-visualizzazione-stretta',
    date: '2026-11-27',
    title: 'Visualizzazione larga o stretta',
    description:
      'In Il mio account > Preferenze personali puoi scegliere la visualizzazione: Estesa (quella di sempre) oppure Compatta, con righe e riquadri più stretti (Home inclusa). Vale da computer; sul telefono resta com\'è. Le Novità ora sono divise in pagine.',
    tag: 'novità'
  },
  {
    id: '2026-11-27-allineamento-accessi',
    date: '2026-11-27',
    title: 'Controlli della stessa altezza e accessi più chiari',
    description:
      'Pulsanti, menu, filtri e interruttori hanno ora tutti la stessa altezza, così passando da una vista all\'altra (Task, Sub-task, Clienti…) restano allineati. In Admin il Registro accessi mostra solo la tabella per persona (ultimo accesso e ultima attività), senza l\'elenco di ogni singolo login.',
    tag: 'miglioramento'
  },
  {
    id: '2026-11-27-frecce-icone',
    date: '2026-11-27',
    title: 'Frecce e caselle sempre visibili',
    description:
      'Nei menu a tendina con ricerca (owner, cliente...) la freccia non compare più come un quadratino bianco su alcuni dispositivi. Stesso fix per le frecce di ordinamento delle tabelle e per le caselle "Mostra completati/annullati".',
    tag: 'correzione'
  },
  {
    id: '2026-11-27-account-sottoviste',
    date: '2026-11-27',
    title: 'Stessa struttura in tutta l\'app',
    description:
      'Anche Il mio account ha le sue sottoviste sotto il menu (Preferenze personali, Notifiche con il totale e le nuove). Nel Team, in Admin e nell\'account le spiegazioni sono ora in fondo, in piccolo, e le sezioni partono subito dal contenuto.',
    tag: 'miglioramento'
  },
  {
    id: '2026-11-27-dettagli-menu',
    date: '2026-11-27',
    title: 'Ritocchi: ricerca, avvisi, uscita, filtri',
    description:
      'La ricerca dice solo "Cerca". Nel menu degli avvisi i tab mostrano il totale tra parentesi e le nuove, come nel tuo account. "Esci" diventa un\'icona e chiede conferma. Task, Sub-task e Clienti si aprono di default sui tuoi record. I menu dei filtri sono grigi finché non ne scegli uno.',
    tag: 'miglioramento'
  },
  {
    id: '2026-11-27-layout-uniforme',
    date: '2026-11-27',
    title: 'Pagine con la stessa impostazione',
    description:
      'Tolti i titoli giganti: la pagina si riconosce dal menu e dalla sottovista. In tutte le pagine c\'è la stessa riga in alto, con la vista a sinistra e i pulsanti a destra, e le stesse spaziature. Le briciole restano dove si naviga in profondità, anche nel tuo account e nelle Novità. In Admin le spiegazioni sono in fondo e il credito della mappa è passato sotto la mappa.',
    tag: 'miglioramento'
  },
  {
    id: '2026-11-27-sottoviste',
    date: '2026-11-27',
    title: 'Sottoviste sotto il menu e più spazio',
    description:
      'Sotto il menu principale compare la barra delle sottoviste: in Admin le sezioni (Profili, Ruoli, Paesi, registri…), nei Task le due viste Task e Sub-task. Nuova lista Sub-task con miei, del mio team, tutti e le tue viste salvate. Tolti il titolo grande e le briciole dalle pagine principali per far partire subito il contenuto.',
    tag: 'novità'
  },
  {
    id: '2026-11-27-elimina-persona',
    date: '2026-11-27',
    title: 'Eliminare una persona dal Team la rimuove davvero',
    description:
      'Eliminando una persona dal Team si cancella anche il suo account. Se è ancora owner di task, sub-task o clienti, o ha scritto commenti, l\'eliminazione si blocca e ti dice cosa riassegnare. I record che ha solo creato restano, senza il nome del creatore.',
    tag: 'miglioramento'
  },
  {
    id: '2026-11-27-viste-icone-accessi',
    date: '2026-11-27',
    title: 'Viste con icone e accesso più sicuro',
    description:
      'Salvare ed eliminare una vista ora si fa con due icone (con il suggerimento al passaggio del mouse). Una persona rimossa dal Team che aveva ancora dati collegati non può più rientrare da sola: tornando ad accedere compare come richiesta in attesa da approvare.',
    tag: 'miglioramento'
  },
  {
    id: '2026-11-27-viste-clienti',
    date: '2026-11-27',
    title: 'Viste anche nei Clienti, ruoli colorati nel Team',
    description:
      'Anche nei Clienti c\'è il menu delle viste: miei clienti, del mio team, tutti, più le tue viste salvate con filtri e ricerca. Nel Team ogni ruolo ha ora un colore diverso, così si distinguono a colpo d\'occhio.',
    tag: 'miglioramento'
  },
  {
    id: '2026-11-27-viste-standard',
    date: '2026-11-27',
    title: 'Viste standard: miei, del mio team, tutti',
    description:
      'Nei Task il pulsante Tutti/I miei è ora nel menu delle viste, insieme a Del mio team e alle tue viste salvate. Le stesse viste valgono in Home e nei Report, grafici compresi, e la scelta resta la stessa tra le pagine. Quali compaiono dipende dal tuo ruolo. Nel Team il ruolo ha un badge colorato, e i permessi delle sezioni Admin sono ora applicati anche ai pulsanti.',
    tag: 'miglioramento'
  },
  {
    id: '2026-11-27-permessi-matrice',
    date: '2026-11-27',
    title: 'Permessi più semplici e scalabili',
    description:
      'Nei profili sparisce "Gestire": ora ogni entità, comprese Team e le sezioni Admin, ha Visualizzare, Creare, Modificare, Eliminare. Senza "Visualizzare" la voce o il tab non compare nemmeno. La matrice è raggruppata (Dati e Amministrazione), con caselle da spuntare e una scorciatoia Tutto/Niente per riga. I profili esistenti mantengono gli stessi permessi.',
    tag: 'miglioramento'
  },
  {
    id: '2026-11-27-predefiniti-nuovi-utenti',
    date: '2026-11-27',
    title: 'Profilo e ruolo predefiniti per i nuovi utenti',
    description:
      'In Admin puoi segnare un profilo e un ruolo come predefiniti: ogni nuovo utente, invitato o registrato da solo, parte con quelli. Il profilo Admin non può essere predefinito; il primo utente della piattaforma resta sempre admin.',
    tag: 'novità'
  },
  {
    id: '2026-11-27-visibilita-per-ruolo',
    date: '2026-11-27',
    title: 'Visibilità dei record in base al ruolo',
    description:
      'Ora il ruolo di ogni persona decide cosa vede: solo i propri task, i propri e quelli dei ruoli sottostanti, oppure tutti; e i clienti tutti o solo quelli collegati. Vale per liste, dettagli, Home, Report, ricerca, commenti e attività. Chi non ha un ruolo e il profilo Admin vedono tutto, come prima.',
    tag: 'novità'
  },
  {
    id: '2026-11-27-ruoli-gerarchia',
    date: '2026-11-27',
    title: 'Ruoli ad albero per la visibilità',
    description:
      'Nell\'area Admin c\'è il nuovo tab Ruoli e visibilità: crei la gerarchia dell\'azienda e per ogni ruolo scegli quali task e clienti si vedono. Il ruolo di una persona si assegna da Team; passando il mouse sul profilo compare la sua descrizione. Per ora il ruolo si imposta ma non limita ancora cosa si vede.',
    tag: 'novità'
  },
  {
    id: '2026-11-27-profili-e-account',
    date: '2026-11-27',
    title: 'Profili modificabili, permessi anche per Team e Admin',
    description:
      'I permessi si assegnano con i Profili: nome e descrizione sono modificabili, e ora si decide anche chi può gestire il Team, le impostazioni Admin e i profili stessi. Deve sempre restare almeno un amministratore attivo. La tua pagina personale si chiama ora Il mio account.',
    tag: 'novità'
  },
  {
    id: '2026-11-27-profili-permessi',
    date: '2026-11-27',
    title: 'Profili personalizzati e permessi',
    description:
      'Nell\'area Admin c\'è il nuovo tab Profili e permessi: puoi creare profili e scegliere, per task, sub-task, clienti, commenti e notifiche, chi può creare, modificare ed eliminare (nessuno, solo i propri o tutti). Il profilo si assegna da Team.',
    tag: 'novità'
  },
  {
    id: '2026-11-27-notifiche-preferenze-menu',
    date: '2026-11-27',
    title: 'Notifiche più pulite e icona Novità',
    description:
      'La scelta di quali notifiche ricevere ora si apre dal menu con i tre puntini delle notifiche, senza occupare spazio nella pagina. In alto la voce Novità è diventata un\'icona con il pallino rosso quando c\'è qualcosa da leggere.',
    tag: 'miglioramento'
  },
  {
    id: '2026-11-27-notifiche-seleziona',
    date: '2026-11-27',
    title: 'Notifiche: menu opzioni e selezione',
    description:
      'Nell\'elenco delle notifiche c\'è ora il menu con i tre puntini: Seleziona notifiche e Segna tutte come lette. I check compaiono solo quando scegli di selezionare, e poi puoi segnare come lette quelle scelte (solo l\'amministratore può eliminarle).',
    tag: 'novità'
  },
  {
    id: '2026-11-27-esporta-unificato',
    date: '2026-11-27',
    title: 'Esporta: una sola voce, con scelta tra vista e tutto',
    description:
      'Nel menu delle tabelle resta solo Esporta…: nel popup scegli se esportare la vista attuale oppure, nei task, tutto con task e sub-task su due fogli. Nella Home ho anche allineato meglio i riquadri.',
    tag: 'miglioramento'
  },
  {
    id: '2026-11-27-profilo-totale-notifiche',
    date: '2026-11-27',
    title: 'Profilo: totale notifiche sempre visibile',
    description:
      'Nel profilo il tab Notifiche mostra tra parentesi il totale di menzioni e altro insieme, e un marcatore rosso quando ce ne sono di nuove, anche senza aprirlo.',
    tag: 'miglioramento'
  },
  {
    id: '2026-11-27-dettagli-pannello-laterale',
    date: '2026-11-27',
    title: 'Dettagli: pannello laterale e modifica rapida sui sub-task',
    description:
      'Su schermi larghi, nelle pagine di task, sub-task e cliente commenti e attività stanno in un pannello a destra, così hai tutto sotto gli occhi. Anche il sub-task ha ora la barra di stato cliccabile e la modifica rapida di owner e scadenza.',
    tag: 'miglioramento'
  },
  {
    id: '2026-11-27-home-personalizzabile',
    date: '2026-11-27',
    title: 'Home personalizzabile',
    description:
      'Da computer, con il pulsante Personalizza nella Home, scegli quali blocchi mostrare (calendario, indicatori, scadenze di task e sub-task) e in che ordine. La scelta è tua e resta salvata.',
    tag: 'novità'
  },
  {
    id: '2026-11-27-liste-azioni-viste',
    date: '2026-11-27',
    title: 'Task: azioni multiple e viste salvate',
    description:
      'Nella lista dei task puoi selezionare più righe e cambiare stato o owner in un colpo solo. Inoltre puoi salvare con un nome la combinazione di filtri e ordinamento che usi spesso e riapplicarla quando vuoi.',
    tag: 'novità'
  },
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
      'Da computer, sopra le tabelle principali trovi il pulsante con i tre puntini ("Opzioni"): da lì scegli le colonne da vedere oppure esporti i dati in Excel o CSV, decidendo righe, colonne e intestazioni. Nelle Notifiche del profilo, le schede mostrano ora quante notifiche ci sono e quante sono da leggere.',
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
