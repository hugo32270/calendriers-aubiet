import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  GeoJSON,
  Circle,
  Marker,
  useMap
} from 'react-leaflet'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const sponsorIcon = L.divIcon({
  html: '<div style="font-size:24px;line-height:24px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.45));">⭐</div>',
  className: 'sponsor-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -10]
})

function estSponsor(adresse) {
  return String(adresse.commentaire || '')
    .trim()
    .toLowerCase() === 'sponsor'
}

function getColor(statut) {
  switch (statut) {
    case 'Fait':
      return 'green'
    case 'Absent':
      return 'orange'
    case 'Refus':
      return 'red'
    case 'A repasser':
      return 'blue'
    default:
      return 'gray'
  }
}

function RecentrerCarte({ position }) {
  const map = useMap()

  useEffect(() => {
    if (position) {
      map.setView(position, 18)
    }
  }, [position, map])

  return null
}

export default function App() {
  const [adresses, setAdresses] = useState([])
  const [limiteCommune, setLimiteCommune] = useState(null)
  const [positionGPS, setPositionGPS] = useState(null)
  const watchIdRef = useRef(null)

  const [distributeur, setDistributeur] = useState(
    localStorage.getItem('distributeur') || ''
  )

  const [filtreRestant, setFiltreRestant] = useState(true)
  const [filtreRepasser, setFiltreRepasser] = useState(false)
  const [menuOuvert, setMenuOuvert] = useState(false)

  async function chargerAdresses() {
    const { data, error } = await supabase
      .from('adresses')
      .select('*')

    if (error) {
      console.error('Erreur de chargement des adresses :', error)
      return
    }

    setAdresses(data || [])
  }

  async function changerStatut(id, statut) {
    const commentaire =
      document.getElementById(`commentaire-${id}`)?.value || ''

    const donnees = statut === 'Non traité'
      ? {
          statut: 'Non traité',
          distributeur: null,
          commentaire: null,
          date_traitement: null
        }
      : {
          statut,
          distributeur,
          commentaire,
          date_traitement: new Date().toISOString()
        }

    const { error } = await supabase
      .from('adresses')
      .update(donnees)
      .eq('id', id)

    if (error) {
      console.error('Erreur de mise à jour du statut :', error)
      return
    }

    await chargerAdresses()
  }

  async function enregistrerCommentaire(id) {
    const commentaire =
      document.getElementById(`commentaire-${id}`)?.value || ''

    const { error } = await supabase
      .from('adresses')
      .update({ commentaire })
      .eq('id', id)

    if (error) {
      console.error('Erreur d’enregistrement du commentaire :', error)
      return
    }

    await chargerAdresses()
  }

  async function effacerCommentaire(id) {
    const { error } = await supabase
      .from('adresses')
      .update({ commentaire: null })
      .eq('id', id)

    if (error) {
      console.error('Erreur de suppression du commentaire :', error)
      return
    }

    await chargerAdresses()
  }

  function centrerSurPosition() {
    if (!navigator.geolocation) {
      alert('La géolocalisation n’est pas disponible sur cet appareil.')
      return
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      position => {
        setPositionGPS([
          position.coords.latitude,
          position.coords.longitude
        ])
      },
      error => {
        console.error('Erreur GPS :', error)
        alert('Impossible de récupérer la position GPS.')
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      }
    )
  }

  useEffect(() => {
    chargerAdresses()

    fetch('/aubiet.geojson')
      .then(response => {
        if (!response.ok) {
          throw new Error(`GeoJSON introuvable : ${response.status}`)
        }
        return response.json()
      })
      .then(data => setLimiteCommune(data))
      .catch(error => console.error('Erreur GeoJSON :', error))

    const channel = supabase
      .channel('adresses-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'adresses'
        },
        () => chargerAdresses()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  const adressesHorsSponsors = adresses.filter(adresse => !estSponsor(adresse))
  const sponsors = adresses.length - adressesHorsSponsors.length

  const fait = adressesHorsSponsors.filter(
    adresse => adresse.statut === 'Fait'
  ).length

  const absent = adressesHorsSponsors.filter(
    adresse => adresse.statut === 'Absent'
  ).length

  const refus = adressesHorsSponsors.filter(
    adresse => adresse.statut === 'Refus'
  ).length

  const repasser = adressesHorsSponsors.filter(
    adresse => adresse.statut === 'A repasser'
  ).length

  const traites = fait + absent + refus + repasser
  const restant = Math.max(0, adressesHorsSponsors.length - traites)
  const pourcentage = adressesHorsSponsors.length > 0
    ? Math.round((traites / adressesHorsSponsors.length) * 100)
    : 0

  let adressesAffichees = adresses

  if (filtreRestant) {
    adressesAffichees = adressesAffichees.filter(adresse =>
      estSponsor(adresse) ||
      !adresse.statut ||
      adresse.statut === 'Non traité'
    )
  }

  if (filtreRepasser) {
    adressesAffichees = adressesAffichees.filter(
      adresse => !estSponsor(adresse) && adresse.statut === 'A repasser'
    )
  }

  function contenuPopup(adresse) {
    const sponsor = estSponsor(adresse)

    return (
      <Popup minWidth={260}>
        <h3 style={{ marginTop: 0 }}>{adresse.adresse}</h3>

        {sponsor && (
          <p
            style={{
              color: '#b8860b',
              fontWeight: 'bold',
              fontSize: '18px',
              textAlign: 'center'
            }}
          >
            ⭐ Sponsor du club
          </p>
        )}

        {!sponsor && (
          <>
            <p>
              Statut : {adresse.statut || 'Non traité'}
            </p>

            <p>
              Distributeur : {adresse.distributeur || '-'}
            </p>

            {adresse.date_traitement && (
              <p style={{ fontSize: '12px', color: '#666' }}>
                🕒 {new Date(adresse.date_traitement).toLocaleString('fr-FR')}
              </p>
            )}
          </>
        )}

        {adresse.commentaire && (
          <p
            style={{
              background: '#f5f5f5',
              padding: '8px',
              borderRadius: '5px'
            }}
          >
            📝 {adresse.commentaire}
          </p>
        )}

        <textarea
          placeholder="Commentaire..."
          defaultValue={adresse.commentaire || ''}
          id={`commentaire-${adresse.id}`}
          style={{
            boxSizing: 'border-box',
            width: '100%',
            minHeight: '70px',
            padding: '8px',
            marginBottom: '10px',
            borderRadius: '8px',
            border: '1px solid #bbb',
            fontSize: '16px',
            resize: 'vertical'
          }}
        />

        <button
          style={boutonPopup('#1976d2')}
          onClick={() => enregistrerCommentaire(adresse.id)}
        >
          💾 Enregistrer le commentaire
        </button>

        <button
          style={boutonPopup('#6c757d')}
          onClick={() => effacerCommentaire(adresse.id)}
        >
          🗑️ Effacer le commentaire
        </button>

        {!sponsor && (
          <>
            <button
              style={boutonPopup('#2e7d32')}
              onClick={() => changerStatut(adresse.id, 'Fait')}
            >
              ✅ Fait
            </button>

            <button
              style={boutonPopup('#ef8c00')}
              onClick={() => changerStatut(adresse.id, 'Absent')}
            >
              🟠 Absent
            </button>

            <button
              style={boutonPopup('#c62828')}
              onClick={() => changerStatut(adresse.id, 'Refus')}
            >
              🔴 Refus
            </button>

            <button
              style={boutonPopup('#1565c0')}
              onClick={() => changerStatut(adresse.id, 'A repasser')}
            >
              🔵 À repasser
            </button>

            <button
              style={boutonPopup('#757575')}
              onClick={() => changerStatut(adresse.id, 'Non traité')}
            >
              ⚪ Annuler la saisie
            </button>
          </>
        )}
      </Popup>
    )
  }

  if (!distributeur) {
    return (
      <div
        style={{
          minHeight: '100vh',
          padding: '20px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '15px',
          textAlign: 'center'
        }}
      >
        <h1 style={{ margin: 0 }}>Distribution Calendriers Aubiet</h1>

        <input
          id="nomDistributeur"
          placeholder="Nom du distributeur"
          style={{
            boxSizing: 'border-box',
            padding: '12px',
            width: 'min(100%, 300px)',
            fontSize: '16px',
            borderRadius: '8px',
            border: '1px solid #aaa'
          }}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              const nom = event.currentTarget.value.trim()
              if (nom) {
                localStorage.setItem('distributeur', nom)
                setDistributeur(nom)
              }
            }
          }}
        />

        <button
          style={{
            padding: '12px 22px',
            border: 'none',
            borderRadius: '8px',
            background: '#1976d2',
            color: 'white',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
          onClick={() => {
            const nom = document
              .getElementById('nomDistributeur')
              ?.value
              .trim()

            if (!nom) return

            localStorage.setItem('distributeur', nom)
            setDistributeur(nom)
          }}
        >
          Connexion
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        height: '100dvh',
        width: '100vw',
        overflow: 'hidden'
      }}
    >
      <button
        onClick={() => setMenuOuvert(!menuOuvert)}
        aria-label={menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'}
        style={{
          position: 'absolute',
          top: 90,
          left: 10,
          zIndex: 3000,
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          fontSize: '24px',
          fontWeight: 'bold',
          boxShadow: '0 4px 15px rgba(0,0,0,0.25)'
        }}
      >
        {menuOuvert ? '×' : '☰'}
      </button>

      {menuOuvert && (
        <div
          style={{
            position: 'absolute',
            zIndex: 2500,
            top: 150,
            left: 10,
            width: 'min(230px, calc(100vw - 20px))',
            maxHeight: 'calc(100dvh - 170px)',
            overflowY: 'auto',
            boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            padding: '12px',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.45)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            fontSize: '13px'
          }}
        >
          <h3 style={{ marginTop: 0, textAlign: 'center' }}>
            Calendriers Aubiet
          </h3>

          <div
            style={{
              width: '74px',
              height: '74px',
              borderRadius: '50%',
              background: `conic-gradient(#4CAF50 ${pourcentage}%, #e0e0e0 0)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto'
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                background: 'rgba(255,255,255,0.95)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}
            >
              {pourcentage}%
            </div>
          </div>

          <div>👤 {distributeur}</div>
          <hr />
          <div>✅ Fait : {fait}</div>
          <div>🟠 Absent : {absent}</div>
          <div>🔴 Refus : {refus}</div>
          <div>🔵 À repasser : {repasser}</div>
          <div>⭐ Sponsors : {sponsors}</div>
          <div style={{ fontWeight: 'bold' }}>⚪ Restant : {restant}</div>
          <hr />

          <label style={{ display: 'block', marginBottom: '12px' }}>
            <input
              type="checkbox"
              checked={filtreRestant}
              onChange={() => setFiltreRestant(!filtreRestant)}
            />{' '}
            Adresses restantes uniquement
          </label>

          <label style={{ display: 'block', marginBottom: '14px' }}>
            <input
              type="checkbox"
              checked={filtreRepasser}
              onChange={() => setFiltreRepasser(!filtreRepasser)}
            />{' '}
            Adresses à repasser uniquement
          </label>

          <button
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #aaa',
              background: 'white'
            }}
            onClick={() => {
              localStorage.removeItem('distributeur')
              window.location.reload()
            }}
          >
            Déconnexion
          </button>
        </div>
      )}

      <button
        onClick={centrerSurPosition}
        aria-label="Centrer sur ma position"
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          zIndex: 3000,
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          border: 'none',
          background: positionGPS ? '#0d6efd' : '#6c757d',
          color: 'white',
          fontSize: '28px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
        }}
      >
        📍
      </button>

      <MapContainer
        center={[43.646, 0.784]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        <RecentrerCarte position={positionGPS} />

        {positionGPS && (
          <>
            <Circle
              center={positionGPS}
              radius={4}
              pathOptions={{
                color: '#0066ff',
                fillColor: '#0066ff',
                fillOpacity: 1
              }}
            />
            <Circle
              center={positionGPS}
              radius={20}
              pathOptions={{
                color: '#0066ff',
                fillColor: '#0066ff',
                fillOpacity: 0.08
              }}
            />
            <Circle
              center={positionGPS}
              radius={40}
              pathOptions={{
                color: '#0066ff',
                fillColor: '#0066ff',
                fillOpacity: 0.05
              }}
            />
          </>
        )}

        {limiteCommune && (
          <GeoJSON
            data={limiteCommune}
            style={{
              color: '#000000',
              weight: 4,
              fillOpacity: 0
            }}
          />
        )}

        {adressesAffichees.map(adresse => {
          const latitude = Number(adresse.latitude)
          const longitude = Number(adresse.longitude)

          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return null
          }

          if (estSponsor(adresse)) {
            return (
              <Marker
                key={adresse.id}
                position={[latitude, longitude]}
                icon={sponsorIcon}
              >
                {contenuPopup(adresse)}
              </Marker>
            )
          }

          return (
            <CircleMarker
              key={adresse.id}
              center={[latitude, longitude]}
              radius={8}
              pathOptions={{ color: getColor(adresse.statut) }}
            >
              {contenuPopup(adresse)}
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}

function boutonPopup(couleur) {
  return {
    width: '100%',
    padding: '11px',
    marginBottom: '8px',
    borderRadius: '8px',
    border: 'none',
    background: couleur,
    color: 'white',
    fontSize: '15px',
    fontWeight: 'bold'
  }
}
