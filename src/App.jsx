import { useEffect, useState } from 'react'
import { supabase } from './supabase'

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  GeoJSON,
  Marker,
  Circle,
  useMap
} from 'react-leaflet'

import 'leaflet/dist/leaflet.css'

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
  const [positionGPS, setPositionGPS] =
  useState(null)

  const [distributeur, setDistributeur] = useState(
    localStorage.getItem('distributeur') || ''
  )

  const [filtreRestant, setFiltreRestant] =
    useState(true)

  const [filtreRepasser, setFiltreRepasser] =
    useState(false)

  const [menuOuvert, setMenuOuvert] =
  useState(false)

  async function chargerAdresses() {

    const { data, error } = await supabase
      .from('adresses')
      .select('*')

    if (error) {
      console.error(error)
      return
    }

    setAdresses(data || [])
  }

  async function changerStatut(id, statut) {

    let donnees

    if (statut === 'Non traité') {

      donnees = {
        statut: 'Non traité',
        distributeur: null,
        date_traitement: null
      }

    } else {

      donnees = {
        statut,
        distributeur,
        date_traitement:
          new Date().toISOString()
      }

    }

    

    const { error } = await supabase
      .from('adresses')
      .update(donnees)
      .eq('id', id)

    if (error) {
      console.error(error)
      return
    }

    chargerAdresses()
  }

  function centrerSurPosition() {

  navigator.geolocation.watchPosition(

    (position) => {

      setPositionGPS([
        position.coords.latitude,
        position.coords.longitude
      ])

    },

    (error) => {

      console.error(error)

      alert(
        'Impossible de récupérer la position GPS'
      )

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
      .then(response => response.json())
      .then(data => {
        setLimiteCommune(data)
      })
      .catch(error => {
        console.error(error)
      })

    const channel = supabase
      .channel('adresses-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'adresses'
        },
        () => {
          chargerAdresses()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }

  }, [])

  const fait = adresses.filter(
    a => a.statut === 'Fait'
  ).length

  const absent = adresses.filter(
    a => a.statut === 'Absent'
  ).length

  const refus = adresses.filter(
    a => a.statut === 'Refus'
  ).length

  const repasser = adresses.filter(
    a => a.statut === 'A repasser'
  ).length

  const restant =
    adresses.length -
    (fait + absent + refus + repasser)

  let adressesAffichees = adresses

  if (filtreRestant) {

    adressesAffichees =
      adressesAffichees.filter(
        a =>
          !a.statut ||
          a.statut === 'Non traité'
      )

  }

  if (filtreRepasser) {

    adressesAffichees =
      adressesAffichees.filter(
        a =>
          a.statut === 'A repasser'
      )

  }

  if (!distributeur) {

    return (

      <div
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '15px'
        }}
      >

        <h1>
          Distribution Calendriers Aubiet
        </h1>

        <input
          id="nomDistributeur"
          placeholder="Nom du distributeur"
          style={{
            padding: '10px',
            width: '250px'
          }}
        />

        <button
          onClick={() => {

            const nom =
              document.getElementById(
                'nomDistributeur'
              ).value

            if (!nom) return

            localStorage.setItem(
              'distributeur',
              nom
            )

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
        height: '100vh',
        width: '100vw'
      }}
    >

    <button
  onClick={() =>
    setMenuOuvert(!menuOuvert)
  }
  style={{
    position: 'absolute',
    top: 70,
    left: 10,
    zIndex: 3000,
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    border: 'none',
    background: 'white',
    fontSize: '24px',
    fontWeight: 'bold',
    boxShadow:
      '0 4px 15px rgba(0,0,0,0.25)'
  }}
>
  ☰
</button>

{menuOuvert && (

      <div
  style={{
    position: 'absolute',
    zIndex: 1000,
    top: 80,
    left: 10,
    background: 'white',
    padding: '12px',
    borderRadius: '12px',
    boxShadow:
      '0 4px 15px rgba(0,0,0,0.25)',
    maxWidth: '220px',
    fontSize: '12px'
  }}
>

        <h3>Calendriers Aubiet</h3>

        <div>
          👤 {distributeur}
        </div>

        <hr />

        <div>✅ Fait : {fait}</div>
        <div>🟠 Absent : {absent}</div>
        <div>🔴 Refus : {refus}</div>
        <div>🔵 À repasser : {repasser}</div>
        <div>⚪ Restant : {restant}</div>

        <hr />

        <label>
          <input
            type="checkbox"
            checked={filtreRestant}
            onChange={() =>
              setFiltreRestant(
                !filtreRestant
              )
            }
          />
          {' '}
          Adresses restantes uniquement
        </label>

        <br /><br />

        <label>
          <input
            type="checkbox"
            checked={filtreRepasser}
            onChange={() =>
              setFiltreRepasser(
                !filtreRepasser
              )
            }
          />
          {' '}
          Adresses à repasser uniquement
        </label>

        <br /><br />

        <button
          onClick={() => {

            localStorage.removeItem(
              'distributeur'
            )

            window.location.reload()

          }}
        >
          Déconnexion
        </button>

     </div>

)}

<button
  onClick={centrerSurPosition}
  style={{
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 3000,
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    border: 'none',
    background: '#1976d2',
    color: 'white',
    fontSize: '28px',
    boxShadow:
      '0 4px 15px rgba(0,0,0,0.3)'
  }}
>
  📍
</button>

<MapContainer

        center={[43.646, 0.784]}
        zoom={12}
        style={{
          height: '100%',
          width: '100%'
        }}
      >

        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
<RecentrerCarte
  position={positionGPS}
/>

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
      radius={40}
      pathOptions={{
        color: '#0066ff',
        fillColor: '#0066ff',
        fillOpacity: 0.2
      }}
    />

  </>

)}
``
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

        {adressesAffichees.map(adresse => (

          <CircleMarker
            key={adresse.id}
            center={[
              Number(adresse.latitude),
              Number(adresse.longitude)
            ]}
            radius={8}
            pathOptions={{
              color: getColor(
                adresse.statut
              )
            }}
          >

            <Popup>

              <h3>{adresse.adresse}</h3>

              <p>
                Statut :
                {' '}
                {adresse.statut ||
                  'Non traité'}
              </p>

              <p>
                Distributeur :
                {' '}
                {adresse.distributeur || '-'}
              </p>

              <button
                onClick={() =>
                  changerStatut(
                    adresse.id,
                    'Fait'
                  )
                }
              >
                ✅ Fait
              </button>

              <br /><br />

              <button
                onClick={() =>
                  changerStatut(
                    adresse.id,
                    'Absent'
                  )
                }
              >
                🟠 Absent
              </button>

              <br /><br />

              <button
                onClick={() =>
                  changerStatut(
                    adresse.id,
                    'Refus'
                  )
                }
              >
                🔴 Refus
              </button>

              <br /><br />

              <button
                onClick={() =>
                  changerStatut(
                    adresse.id,
                    'A repasser'
                  )
                }
              >
                🔵 À repasser
              </button>

              <br /><br />

              <button
                onClick={() =>
                  changerStatut(
                    adresse.id,
                    'Non traité'
                  )
                }
              >
                ⚪ Annuler
              </button>

            </Popup>

          </CircleMarker>

        ))}

      </MapContainer>

    </div>
  )
}