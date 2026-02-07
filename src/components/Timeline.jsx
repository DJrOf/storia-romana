import React, { useState, useMemo, useRef, useEffect } from 'react';
import './Timeline.css';
import { romanRulers } from '../data/rulers';

const Timeline = ({ events }) => {
  const [selectedCentury, setSelectedCentury] = useState('all');
  const [selectedRulerFilter, setSelectedRulerFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [rulerFilterSearch, setRulerFilterSearch] = useState('');
  const [isRulerDropdownOpen, setIsRulerDropdownOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedRuler, setSelectedRuler] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, scrollLeft: 0 });
  const timelineWrapperRef = useRef(null);
  const rulerDropdownRef = useRef(null);

  // Estrai secoli unici
  const centuries = useMemo(() => {
    const unique = [...new Set(events.map(e => e.century))];
    return unique.sort((a, b) => {
      const aBC = a.includes('a.C.');
      const bBC = b.includes('a.C.');
      if (aBC && !bBC) return -1;
      if (!aBC && bBC) return 1;
      if (aBC && bBC) {
        const aNum = parseInt(a);
        const bNum = parseInt(b);
        return bNum - aNum;
      }
      const aNum = parseInt(a);
      const bNum = parseInt(b);
      return aNum - bNum;
    });
  }, [events]);

  // Filtra eventi
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesCentury = selectedCentury === 'all' || event.century === selectedCentury;
      const matchesSearch = searchTerm === '' || 
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtra per imperatore se selezionato
      let matchesRuler = true;
      if (selectedRulerFilter !== 'all') {
        const ruler = romanRulers.find(r => r.name === selectedRulerFilter);
        if (ruler) {
          matchesRuler = event.year >= ruler.startYear && event.year <= ruler.endYear;
        }
      }
      
      return matchesCentury && matchesSearch && matchesRuler;
    });
  }, [events, selectedCentury, selectedRulerFilter, searchTerm]);

  // Calcola posizione orizzontale basata sull'anno
  const getEventPosition = (year, minYear, maxYear) => {
    const range = maxYear - minYear;
    if (range === 0) return 0;
    const position = ((year - minYear) / range) * 100;
    return position;
  };

  // Formatta l'anno per la visualizzazione
  const formatYear = (year) => {
    if (year < 0) {
      return `${Math.abs(year)} a.C.`;
    }
    return `${year} d.C.`;
  };

  // Calcola min e max year da tutti gli eventi e rulers
  const minYear = useMemo(() => {
    const eventMin = events.length > 0 ? Math.min(...events.map(e => e.year)) : 0;
    const rulerMin = romanRulers.length > 0 ? Math.min(...romanRulers.map(r => r.startYear)) : 0;
    return Math.min(eventMin, rulerMin);
  }, [events]);

  const maxYear = useMemo(() => {
    const eventMax = events.length > 0 ? Math.max(...events.map(e => e.year)) : 0;
    const rulerMax = romanRulers.length > 0 ? Math.max(...romanRulers.map(r => r.endYear)) : 0;
    return Math.max(eventMax, rulerMax);
  }, [events]);

  // Calcola posizioni dei rulers sulla timeline e filtra per ricerca
  const rulersWithPositions = useMemo(() => {
    return romanRulers.map(ruler => {
      const startX = getEventPosition(ruler.startYear, minYear, maxYear);
      const endX = getEventPosition(ruler.endYear, minYear, maxYear);
      const width = endX - startX;
      const duration = ruler.endYear - ruler.startYear;
      
      // Controlla se il ruler corrisponde al termine di ricerca
      const matchesSearch = searchTerm === '' || 
        ruler.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ruler.type && ruler.type.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Controlla se il ruler corrisponde al filtro selezionato
      const matchesFilter = selectedRulerFilter === 'all' || ruler.name === selectedRulerFilter;
      
      return {
        ...ruler,
        startX,
        endX,
        width: Math.max(width, 2), // Minimo 2% per visibilità e cliccabilità
        duration,
        matchesSearch,
        matchesFilter
      };
    });
  }, [minYear, maxYear, searchTerm, selectedRulerFilter]);

  // Eventi del periodo selezionato (ruler)
  const rulerEvents = useMemo(() => {
    if (!selectedRuler) return [];
    
    // Trova il regno successivo per escludere gli eventi all'anno di inizio del regno successivo
    const currentIndex = romanRulers.findIndex(r => r.name === selectedRuler.name);
    const nextRuler = currentIndex >= 0 && currentIndex < romanRulers.length - 1 
      ? romanRulers[currentIndex + 1] 
      : null;
    
    // Escludi eventi all'anno di inizio del regno successivo (se il regno successivo inizia subito dopo o nello stesso anno)
    const excludeYear = nextRuler && (nextRuler.startYear === selectedRuler.endYear || nextRuler.startYear === selectedRuler.endYear + 1)
      ? nextRuler.startYear 
      : null;
    
    return filteredEvents.filter(event => {
      // Escludi eventi fuori dal range del regno
      if (event.year < selectedRuler.startYear || event.year > selectedRuler.endYear) {
        return false;
      }
      // Escludi eventi all'anno di inizio del regno successivo (per evitare che compaiano nel regno precedente)
      if (excludeYear && event.year === excludeYear) {
        return false;
      }
      return true;
    });
  }, [filteredEvents, selectedRuler]);

  // Gestione drag and drop
  const handleMouseDown = (e) => {
    if (e.target.closest('.ruler-rectangle') || e.target.closest('.event-dot')) {
      return;
    }
    setIsDragging(true);
    setDragStart({
      x: e.pageX - timelineWrapperRef.current.offsetLeft,
      scrollLeft: timelineWrapperRef.current.scrollLeft
    });
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - timelineWrapperRef.current.offsetLeft;
    const walk = (x - dragStart.x) * 2;
    timelineWrapperRef.current.scrollLeft = dragStart.scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Gestione click su rettangolo ruler
  const handleRulerClick = (ruler, e) => {
    e.stopPropagation();
    if (selectedRuler && selectedRuler.name === ruler.name) {
      setSelectedRuler(null);
    } else {
      setSelectedRuler(ruler);
    }
  };

  // Scroll automatico per centrare il ruler selezionato
  useEffect(() => {
    if (selectedRuler && timelineWrapperRef.current) {
      // Trova il rettangolo del ruler nel DOM
      const rulerElement = document.querySelector(`[data-ruler-name="${selectedRuler.name}"]`);
      if (rulerElement) {
        // Usa setTimeout per assicurarsi che il DOM sia aggiornato
        setTimeout(() => {
          const wrapper = timelineWrapperRef.current;
          const timeline = wrapper.querySelector('.timeline');
          
          if (wrapper && timeline && rulerElement) {
            // Calcola la posizione del rettangolo relativa al wrapper
            const rulerRect = rulerElement.getBoundingClientRect();
            const wrapperRect = wrapper.getBoundingClientRect();
            const timelineRect = timeline.getBoundingClientRect();
            
            // Calcola la posizione del centro del rettangolo
            const rulerCenterX = rulerRect.left + rulerRect.width / 2;
            
            // Calcola la posizione del centro del wrapper visibile
            const wrapperCenterX = wrapperRect.left + wrapperRect.width / 2;
            
            // Calcola quanto dobbiamo scrollare per centrare il rettangolo
            const scrollOffset = rulerCenterX - wrapperCenterX;
            
            // Applica lo scroll con animazione smooth
            wrapper.scrollTo({
              left: wrapper.scrollLeft + scrollOffset,
              behavior: 'smooth'
            });
          }
        }, 100);
      }
    }
  }, [selectedRuler]);


  // Gestione click su pallino evento
  const handleEventDotClick = (event, e) => {
    e.stopPropagation();
    setSelectedEvent(event);
  };

  // Chiudi dropdown quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rulerDropdownRef.current && !rulerDropdownRef.current.contains(event.target)) {
        setIsRulerDropdownOpen(false);
        setRulerFilterSearch('');
      }
    };

    if (isRulerDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isRulerDropdownOpen]);

  // Funzione per centrare la timeline su una posizione specifica (in percentuale)
  const scrollToPosition = (positionPercent) => {
    if (!timelineWrapperRef.current) return;
    
    setTimeout(() => {
      const wrapper = timelineWrapperRef.current;
      const timeline = wrapper.querySelector('.timeline');
      
      if (wrapper && timeline) {
        const timelineWidth = timeline.offsetWidth;
        const wrapperWidth = wrapper.offsetWidth;
        const targetScrollLeft = (timelineWidth * positionPercent / 100) - (wrapperWidth / 2);
        
        wrapper.scrollTo({
          left: Math.max(0, targetScrollLeft),
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  // Funzione per focalizzare la timeline quando si cambia un filtro
  const focusOnFilter = (filterValue, filterType) => {
    if (filterValue === 'all') return;
    
    setTimeout(() => {
      if (filterType === 'century') {
        // Trova il primo evento del secolo selezionato (prima del filtro per imperatore)
        const centuryEvents = events.filter(event => {
          const matchesCentury = event.century === filterValue;
          const matchesSearch = searchTerm === '' || 
            event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.description.toLowerCase().includes(searchTerm.toLowerCase());
          return matchesCentury && matchesSearch;
        });
        
        const firstEvent = centuryEvents[0];
        if (firstEvent) {
          const rulerForEvent = romanRulers.find(ruler => 
            firstEvent.year >= ruler.startYear && firstEvent.year <= ruler.endYear
          );
          
          if (rulerForEvent) {
            setSelectedRuler(rulerForEvent);
            setTimeout(() => {
              const eventPosition = getEventPosition(firstEvent.year, minYear, maxYear);
              scrollToPosition(eventPosition);
            }, 200);
          } else {
            const eventPosition = getEventPosition(firstEvent.year, minYear, maxYear);
            scrollToPosition(eventPosition);
          }
        }
      } else if (filterType === 'ruler') {
        // Trova il regnante selezionato e focalizza su di esso
        const ruler = romanRulers.find(r => r.name === filterValue);
        if (ruler) {
          setSelectedRuler(ruler);
          // Lo scroll automatico verrà gestito dall'useEffect esistente
        }
      }
    }, 100);
  };

  // Gestione ricerca con Invio
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase().trim();
      
      // Prima cerca tra i regnanti
      const matchingRuler = rulersWithPositions.find(ruler => 
        ruler.matchesSearch && (
          ruler.name.toLowerCase().includes(searchLower) ||
          (ruler.type && ruler.type.toLowerCase().includes(searchLower))
        )
      );
      
      if (matchingRuler) {
        // Seleziona il regnante e centra la timeline
        setSelectedRuler(matchingRuler);
        // Lo scroll automatico verrà gestito dall'useEffect esistente
        return;
      }
      
      // Se non trova un regnante, cerca tra gli eventi
      const matchingEvent = filteredEvents[0];
      if (matchingEvent) {
        // Trova il regnante che governava nell'anno dell'evento
        const rulerForEvent = romanRulers.find(ruler => 
          matchingEvent.year >= ruler.startYear && matchingEvent.year <= ruler.endYear
        );
        
        if (rulerForEvent) {
          // Seleziona il regnante per mostrare gli eventi
          setSelectedRuler(rulerForEvent);
          
          // Dopo aver selezionato il regnante, centra sull'evento
          setTimeout(() => {
            const eventPosition = getEventPosition(matchingEvent.year, minYear, maxYear);
            scrollToPosition(eventPosition);
            
            // Seleziona anche l'evento dopo un breve delay
            setTimeout(() => {
              setSelectedEvent(matchingEvent);
            }, 300);
          }, 200);
        } else {
          // Se non c'è un regnante, centra comunque sull'anno dell'evento
          const eventPosition = getEventPosition(matchingEvent.year, minYear, maxYear);
          scrollToPosition(eventPosition);
          setSelectedEvent(matchingEvent);
        }
      }
    }
  };

  return (
    <div className="timeline-container">
      <div className="timeline-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Cerca eventi e re/imperatori..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="search-input"
          />
        </div>
        
        <div className="filter-box">
          <label htmlFor="century-filter">Filtra per secolo:</label>
          <select
            id="century-filter"
            value={selectedCentury}
            onChange={(e) => {
              setSelectedCentury(e.target.value);
              focusOnFilter(e.target.value, 'century');
            }}
            className="century-select"
          >
            <option value="all">Tutti i secoli</option>
            {centuries.map(century => (
              <option key={century} value={century}>{century}</option>
            ))}
          </select>
        </div>

        <div className="filter-box">
          <label htmlFor="ruler-filter">Filtra per imperatore:</label>
          <div className={`ruler-select-wrapper ${isRulerDropdownOpen ? 'open' : ''}`} ref={rulerDropdownRef}>
            <div 
              className="ruler-select-trigger"
              onClick={() => setIsRulerDropdownOpen(!isRulerDropdownOpen)}
            >
              {selectedRulerFilter === 'all' ? 'Tutti gli imperatori' : selectedRulerFilter}
            </div>
            {isRulerDropdownOpen && (
              <div className="ruler-select-dropdown">
                <input
                  type="text"
                  className="ruler-select-search"
                  placeholder="Cerca imperatore..."
                  value={rulerFilterSearch}
                  onChange={(e) => setRulerFilterSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
                <div className="ruler-select-options">
                  <div
                    className={`ruler-select-option ${selectedRulerFilter === 'all' ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedRulerFilter('all');
                      setIsRulerDropdownOpen(false);
                      setRulerFilterSearch('');
                      focusOnFilter('all', 'ruler');
                    }}
                  >
                    Tutti gli imperatori
                  </div>
                  {romanRulers
                    .filter(ruler => 
                      rulerFilterSearch === '' || 
                      ruler.name.toLowerCase().includes(rulerFilterSearch.toLowerCase())
                    )
                    .map(ruler => (
                      <div
                        key={ruler.name}
                        className={`ruler-select-option ${selectedRulerFilter === ruler.name ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedRulerFilter(ruler.name);
                          setIsRulerDropdownOpen(false);
                          setRulerFilterSearch('');
                          focusOnFilter(ruler.name, 'ruler');
                        }}
                      >
                        {ruler.name}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      <div 
        className="timeline-wrapper" 
        ref={timelineWrapperRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div 
          className="timeline" 
          style={{ 
            minWidth: `${Math.max(3000, (maxYear - minYear) * 5)}px`
          }}
        >
          <div className="timeline-line"></div>
          
          {/* Rettangoli dei re/imperatori */}
          {rulersWithPositions.map((ruler, index) => {
            const isSelected = selectedRuler && selectedRuler.name === ruler.name;
            const isHighlighted = (searchTerm !== '' && ruler.matchesSearch) || 
                                 (selectedRulerFilter !== 'all' && ruler.matchesFilter);
            
            return (
              <div
                key={`${ruler.name}-${index}`}
                className={`ruler-rectangle ${isSelected ? 'selected' : ''} ${isHighlighted ? 'search-highlight' : ''}`}
                style={{
                  left: `${ruler.startX}%`,
                  width: `${ruler.width}%`,
                }}
                onClick={(e) => handleRulerClick(ruler, e)}
                title={`${ruler.name} (${formatYear(ruler.startYear)} - ${formatYear(ruler.endYear)})`}
                data-ruler-name={ruler.name}
                data-start-year={ruler.startYear}
                data-end-year={ruler.endYear}
              >
                <div className="ruler-name">{ruler.name}</div>
              </div>
            );
          })}

          {/* Linea verticale per l'anno 0 (Nascita di Gesù Cristo) */}
          {(() => {
            const year0Position = getEventPosition(0, minYear, maxYear);
            return (
              <div
                className="year-zero-marker"
                style={{ left: `${year0Position}%` }}
                title="Anno 0 - Nascita di Gesù Cristo"
              >
                <div className="year-zero-label">Anno 0 - Nascita di Gesù Cristo</div>
              </div>
            );
          })()}

          {/* Asse delle ascisse con gli anni */}
          {(() => {
            // Calcola il passo degli anni in base all'intervallo
            const yearRange = maxYear - minYear;
            let yearStep = 1;
            
            if (yearRange > 2000) yearStep = 100;
            else if (yearRange > 1000) yearStep = 50;
            else if (yearRange > 500) yearStep = 25;
            else if (yearRange > 200) yearStep = 10;
            else if (yearRange > 100) yearStep = 5;
            else if (yearRange > 50) yearStep = 1;
            
            // Genera gli anni da mostrare
            const yearsToShow = [];
            const startYear = Math.ceil(minYear / yearStep) * yearStep;
            const endYear = Math.floor(maxYear / yearStep) * yearStep;
            
            for (let year = startYear; year <= endYear; year += yearStep) {
              yearsToShow.push(year);
            }
            
            // Assicurati che l'anno 0 sia sempre incluso se è nel range
            if (minYear <= 0 && maxYear >= 0 && !yearsToShow.includes(0)) {
              yearsToShow.push(0);
              yearsToShow.sort((a, b) => a - b);
            }
            
            return (
              <div className="x-axis">
                <div className="x-axis-line"></div>
                {yearsToShow.map((year) => {
                  const yearX = getEventPosition(year, minYear, maxYear);
                  return (
                    <div
                      key={`year-${year}`}
                      className="x-axis-tick"
                      style={{ left: `${yearX}%` }}
                      onMouseEnter={() => {
                        // Evidenzia gli anni di inizio e fine dei regni che contengono questo anno
                        rulersWithPositions.forEach(ruler => {
                          if (year >= ruler.startYear && year <= ruler.endYear) {
                            const rulerElement = document.querySelector(`[data-ruler-name="${ruler.name}"]`);
                            if (rulerElement) {
                              rulerElement.classList.add('highlighted');
                            }
                            // Evidenzia anche gli anni di inizio e fine nell'asse
                            const allTicks = document.querySelectorAll('.x-axis-tick');
                            allTicks.forEach(tick => {
                              const tickYear = parseInt(tick.getAttribute('data-year'));
                              if (tickYear === ruler.startYear || tickYear === ruler.endYear) {
                                tick.classList.add('highlighted-tick');
                              }
                            });
                          }
                        });
                      }}
                      onMouseLeave={() => {
                        // Rimuovi evidenziazione
                        document.querySelectorAll('.ruler-rectangle.highlighted').forEach(el => {
                          el.classList.remove('highlighted');
                        });
                        document.querySelectorAll('.x-axis-tick.highlighted-tick').forEach(el => {
                          el.classList.remove('highlighted-tick');
                        });
                      }}
                      data-year={year}
                    >
                      <div className="x-axis-tick-line"></div>
                      <div className="x-axis-tick-label">{formatYear(year)}</div>
                    </div>
                  );
                })}
                
                {/* Pallini degli eventi (solo quando un ruler è selezionato) */}
                {selectedRuler && rulerEvents.map((event, index) => {
                  const absoluteX = getEventPosition(event.year, minYear, maxYear);
                  const isBC = event.year < 0;
                  
                  return (
                    <div
                      key={`${event.year}-${index}-${event.title}`}
                      className={`event-dot-container ${isBC ? 'bc' : 'ad'}`}
                      style={{ left: `${absoluteX}%` }}
                      onClick={(e) => handleEventDotClick(event, e)}
                      title={`${event.title} - ${formatYear(event.year)}`}
                    >
                      <div className={`event-dot ${isBC ? 'bc' : 'ad'}`}></div>
                      <div className="event-year-label">{formatYear(event.year)}</div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

          {/* Sezione eventi sotto la timeline */}
      {selectedRuler && (
        <div className="events-section">
          <div className="events-section-header">
            <h2>Eventi durante il regno di {selectedRuler.name}</h2>
            <span className="ruler-period">
              {formatYear(selectedRuler.startYear)} - {formatYear(selectedRuler.endYear)}
            </span>
            <button 
              className="close-events-button"
              onClick={() => setSelectedRuler(null)}
            >
              ×
            </button>
          </div>
          
          {rulerEvents.length > 0 ? (
            <div className="vertical-timeline">
              <div className="vertical-timeline-line"></div>
              {rulerEvents
                .sort((a, b) => a.year - b.year)
                .map((event, index) => {
                  const isBC = event.year < 0;
                  const isEven = index % 2 === 0;
                  return (
                    <div
                      key={`${event.year}-${index}-${event.title}`}
                      className={`vertical-timeline-item ${isEven ? 'left' : 'right'}`}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="vertical-timeline-marker">
                        <div className={`vertical-timeline-dot ${isBC ? 'bc' : 'ad'}`}></div>
                      </div>
                      <div className="vertical-timeline-content">
                        <div className="vertical-timeline-year">{formatYear(event.year)}</div>
                        <h3 className="vertical-timeline-title">{event.title}</h3>
                        <p className="vertical-timeline-description">{event.description}</p>
                        <div className="vertical-timeline-century">{event.century}</div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: '20px' }}>
              Nessun evento registrato per questo periodo.
            </p>
          )}
        </div>
      )}

      {selectedEvent && (
        <div className="event-modal" onClick={() => setSelectedEvent(null)}>
          <div className="event-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={() => setSelectedEvent(null)}>×</button>
            <h2>{selectedEvent.title}</h2>
            <div className="modal-year">{formatYear(selectedEvent.year)}</div>
            <div className="modal-century">{selectedEvent.century}</div>
            <p className="modal-description">{selectedEvent.description}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timeline;
