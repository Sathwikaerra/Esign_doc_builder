import { Modal } from './Overlay'
import Icon from './Icon'

// Shows a signer's captured location on a map, with its address. location: { lat, lng, accuracy?, address? }
export default function MapModal({ location, onClose, title = 'Location' }) {
  if (!location) return null
  const { lat, lng, accuracy, address } = location
  const query = `${lat},${lng}`
  return (
    <Modal open onClose={onClose} title={title} subtitle={address || 'Address not available'} width={720}>
      <div className="map-frame">
        <iframe title="Map" src={`https://maps.google.com/maps?q=${query}&z=17&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      </div>
      <div className="map-meta">
        <span className="muted small">
          <Icon name="mapPin" size={13} /> {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
          {accuracy != null && ` · within ${Math.round(accuracy)} m`}
        </span>
        <a className="btn sm" href={`https://www.google.com/maps/search/?api=1&query=${query}`} target="_blank" rel="noreferrer">
          <Icon name="external" size={14} /> Open in Google Maps
        </a>
      </div>
    </Modal>
  )
}
