const body = await req.json()
  const { email, firstName, lastName } = body
  if (!email) return NextResponse.json({ error: 'Email obbligatoria' }, { status: 400 })
  if (!firstName) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 })
