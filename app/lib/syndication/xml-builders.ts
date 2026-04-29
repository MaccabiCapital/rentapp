// ============================================================
// ILS feed XML builders
// ============================================================
//
// Two formats: RentalSource (Apartments.com / Realtor.com / etc.)
// and Zillow ILS. Both consume the same listing data and produce
// crawler-friendly XML.
//
// We hand-build the XML rather than pulling a library. The feeds
// are simple, the standards are documented, and a dependency-free
// implementation is easier to maintain.

type ListingForFeed = {
  id: string
  slug: string
  title: string
  description: string | null
  headline_rent: number | null
  available_on: string | null
  contact_email: string | null
  contact_phone: string | null
  property: {
    id: string
    name: string
    street_address: string
    city: string
    state: string
    postal_code: string
    photos: string[] | null
  }
  unit: {
    id: string
    unit_number: string | null
    bedrooms: number | null
    bathrooms: number | null
    square_feet: number | null
    photos: string[] | null
  } | null
}

function escapeXml(s: string | null | undefined): string {
  if (s === null || s === undefined) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function publicListingUrl(appUrl: string, slug: string): string {
  return `${appUrl.replace(/\/$/, '')}/listings/${encodeURIComponent(slug)}`
}

// ------------------------------------------------------------
// RentalSource format (Apartments.com, Realtor.com, Zumper, etc)
// ------------------------------------------------------------

export function buildRentalSourceFeed(opts: {
  listings: ListingForFeed[]
  appUrl: string
  ownerName: string
}): string {
  const now = new Date().toISOString()
  const entries = opts.listings.map((l) => buildRentalSourceProperty(l, opts.appUrl)).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<PhysicalProperty xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Management>
    <Name>${escapeXml(opts.ownerName)}</Name>
    <Identification IDType="syndication" IDValue="rentbase"/>
    <UpdatedDate>${now}</UpdatedDate>
  </Management>
${entries}
</PhysicalProperty>`
}

function buildRentalSourceProperty(
  l: ListingForFeed,
  appUrl: string,
): string {
  const beds = l.unit?.bedrooms ?? 0
  const baths = l.unit?.bathrooms ?? 0
  const sqft = l.unit?.square_feet ?? null
  const rent =
    l.headline_rent !== null && l.headline_rent !== undefined
      ? l.headline_rent
      : null
  const photos = [
    ...(l.property.photos ?? []),
    ...(l.unit?.photos ?? []),
  ]

  const photoXml = photos
    .map(
      (p, i) =>
        `      <File Active="true" Order="${i + 1}">
        <Src>${escapeXml(p)}</Src>
        <Caption>${escapeXml(l.title)}</Caption>
      </File>`,
    )
    .join('\n')

  return `  <Property>
    <PropertyID>
      <Identification IDType="syndication" IDValue="${escapeXml(l.id)}"/>
      <MarketingName>${escapeXml(l.title)}</MarketingName>
      <WebSite>${escapeXml(publicListingUrl(appUrl, l.slug))}</WebSite>
      <Address AddressType="property">
        <AddressLine1>${escapeXml(l.property.street_address)}</AddressLine1>
        <City>${escapeXml(l.property.city)}</City>
        <State>${escapeXml(l.property.state)}</State>
        <PostalCode>${escapeXml(l.property.postal_code)}</PostalCode>
        <Country>US</Country>
      </Address>
      <Phone PhoneType="office">
        <PhoneNumber>${escapeXml(l.contact_phone)}</PhoneNumber>
      </Phone>
      <Email>${escapeXml(l.contact_email)}</Email>
    </PropertyID>
    <ILS_Identification ILS_IdentificationType="Apartment">
      <RentalType>Market</RentalType>
    </ILS_Identification>
    <Information>
      <Description>${escapeXml(l.description ?? l.title)}</Description>
${l.available_on ? `      <UnavailableUntil>${escapeXml(l.available_on)}</UnavailableUntil>` : ''}
    </Information>
    <ILS_Unit>
      <Units>
        <Unit>
          <Identification IDType="syndication" IDValue="${escapeXml(l.unit?.id ?? l.id)}"/>
          <MarketingName>${escapeXml(l.unit?.unit_number ?? l.title)}</MarketingName>
          <UnitBedrooms>${beds}</UnitBedrooms>
          <UnitBathrooms>${baths}</UnitBathrooms>
${sqft !== null ? `          <UnitRent>${rent ?? 0}</UnitRent>\n          <SquareFeet>${sqft}</SquareFeet>` : `          <UnitRent>${rent ?? 0}</UnitRent>`}
        </Unit>
      </Units>
${photoXml ? `      <File>\n${photoXml}\n      </File>` : ''}
    </ILS_Unit>
  </Property>`
}

// ------------------------------------------------------------
// Zillow ILS format
// ------------------------------------------------------------

export function buildZillowFeed(opts: {
  listings: ListingForFeed[]
  appUrl: string
  ownerName: string
}): string {
  const now = new Date().toISOString()
  const entries = opts.listings.map((l) => buildZillowListing(l, opts.appUrl)).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<Listings>
  <SiteInfo>
    <Source>Rentbase</Source>
    <SourceUrl>${escapeXml(opts.appUrl)}</SourceUrl>
    <UpdatedAt>${now}</UpdatedAt>
  </SiteInfo>
${entries}
</Listings>`
}

function buildZillowListing(l: ListingForFeed, appUrl: string): string {
  const beds = l.unit?.bedrooms ?? 0
  const baths = l.unit?.bathrooms ?? 0
  const sqft = l.unit?.square_feet ?? null
  const rent = l.headline_rent ?? 0
  const photos = [
    ...(l.property.photos ?? []),
    ...(l.unit?.photos ?? []),
  ]

  const photoXml = photos
    .map((p) => `      <Picture>${escapeXml(p)}</Picture>`)
    .join('\n')

  return `  <Listing>
    <ListingId>${escapeXml(l.id)}</ListingId>
    <Title>${escapeXml(l.title)}</Title>
    <Url>${escapeXml(publicListingUrl(appUrl, l.slug))}</Url>
    <Description>${escapeXml(l.description ?? l.title)}</Description>
    <PropertyType>Rental</PropertyType>
    <Address>
      <Street>${escapeXml(l.property.street_address)}</Street>
${l.unit?.unit_number ? `      <UnitNumber>${escapeXml(l.unit.unit_number)}</UnitNumber>` : ''}
      <City>${escapeXml(l.property.city)}</City>
      <State>${escapeXml(l.property.state)}</State>
      <Zip>${escapeXml(l.property.postal_code)}</Zip>
      <Country>US</Country>
    </Address>
    <Bedrooms>${beds}</Bedrooms>
    <Bathrooms>${baths}</Bathrooms>
${sqft !== null ? `    <SquareFeet>${sqft}</SquareFeet>` : ''}
    <Rent>${rent}</Rent>
    <Currency>USD</Currency>
${l.available_on ? `    <AvailableDate>${escapeXml(l.available_on)}</AvailableDate>` : ''}
${l.contact_email ? `    <ContactEmail>${escapeXml(l.contact_email)}</ContactEmail>` : ''}
${l.contact_phone ? `    <ContactPhone>${escapeXml(l.contact_phone)}</ContactPhone>` : ''}
    <Photos>
${photoXml}
    </Photos>
  </Listing>`
}
