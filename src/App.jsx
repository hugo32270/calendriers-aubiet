import { useEffect, useState } from 'react'
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

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const sponsorIcon = L.divIcon({
  html: '<div style="font-size:22px;">⭐</div>',
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 11]
})


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
    const commentaire =
  document.getElementById(
    `commentaire-${id}`
  )?.value || ''

    let donnees

   if (statut === 'Non traité') {

  donnees = {
  statut: 'Non traité',
  distributeur: null,
  commentaire: null,
  date_traitement: null
}

}


   else {

  donnees = {
    statut,
    distributeur,
    commentaire,
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

  async function enregistrerCommentaire(id) {

  const commentaire =
    document.getElementById(
      `commentaire-${id}`
    )?.value || ''

  const { error } = await supabase
    .from('adresses')
    .update({
      commentaire
    })
    .eq('id', id)

  if (error) {
    console.error(error)
    return
  }

  chargerAdresses()
  await chargerAdresses()

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

  const pourcentage = Math.round(
  ((fait + absent + refus + repasser)
    / adresses.length) * 100
)
  

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
    top: 90,
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
  top: 110,
  left: 10,
  background: 'rgba(255,255,255,0.75)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  padding: '12px',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.3)',
  boxShadow:
    '0 8px 32px rgba(0,0,0,0.15)',
  maxWidth: '220px',
  fontSize: '12px'
}}

>

        <h3>Calendriers Aubiet</h3>

        <div
  style={{
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    background: `conic-gradient(
      #4CAF50 ${pourcentage}%,
      #e0e0e0 0
    )`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 10px auto'
  }}
>
  <div
    style={{
      width: '50px',
      height: '50px',
      background: 'white',
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

<Circle
  center={positionGPS}
  radius={60}
  pathOptions={{
    color: '#0066ff',
    fillColor: '#0066ff',
    fillOpacity: 0.03
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

  const isSponsor =
    String(adresse.commentaire || '')
      .trim()
      .toLowerCase() === 'sponsor'

  return isSponsor ? (

    <Marker
      key={adresse.id}
      position={[
        Number(adresse.latitude),
        Number(adresse.longitude)
      ]}
      icon={sponsorIcon}
    

    
radius={
String(adresse.commentaire || '')
.trim()
.toLowerCase() === 'sponsor'
? 10
: 8
}
pathOptions={
  String(adresse.commentaire || '')
    .trim()
    .toLowerCase() === 'sponsor'
    ? {
        color: '#FFD700',
        fillColor: '#FFD700',
        fillOpacity: 1,
        weight: 3,
        dashArray: '1'
      }
    : {
        color: getColor(adresse.statut)
      }
}
>

    <Popup>

              <h3>{adresse.adresse}</h3>

              {String(adresse.commentaire || '')
  .trim()
  .toLowerCase() === 'sponsor' && (

  <p
    style={{
      color: '#FFD700',
      fontWeight: 'bold',
      fontSize: '18px'
    }}
  >
    ⭐ Sponsor du club
  </p>

)}

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
              {adresse.date_traitement && (

  <p>
    🕒 {new Date(
      adresse.date_traitement
    ).toLocaleString('fr-FR')}
  </p>

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
    width: '100%',
    minHeight: '60px',
    marginBottom: '10px'
  }}
/>
<button
  style={{
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    borderRadius: '8px'
  }}
  onClick={() =>
    enregistrerCommentaire(
      adresse.id
    )
  }
>
  💾 Enregistrer commentaire
</button>

 <button
  style={{
    width: '100%',
    padding: '12px',
    marginBottom: '8px',
    borderRadius: '8px'
  }}
  onClick={async () => {

    await supabase
      .from('adresses')
      .update({
        commentaire: null
      })
      .eq('id', adresse.id)

    chargerAdresses()

  }}
>
  🗑️ Effacer commentaire
</button>

<br /><br />
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

    </Marker>

  ) : (

    <CircleMarker
      key={adresse.id}
      center={[
        Number(adresse.latitude),
        Number(adresse.longitude)
      ]}
      radius={8}
      pathOptions={{
        color: getColor(adresse.statut)
      }}
    >

      <Popup>

        {/* TOUT LE CONTENU DE LA POPUP */}

      </Popup>

    </CircleMarker>

  )

})}

      </MapContainer>

    </div>
  )
}