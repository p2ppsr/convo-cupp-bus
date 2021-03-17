const { createEvent } = require('@cwi/busdriver')

module.exports = {
  busdriver: '0.1.1',
  id: '16ibuBM9KzHav3sCXpxjV3bkvU3EXdmDWG',
  startingBlockHeight: 676000,
  boardPassenger: async (state, action) => {
    try {
      console.log(`[+] ${action.tx.h}`)
      // Transaction must contain correct protocol namespace
      if (action.out[0].s2 !== '1CUPPJ9Zjs2qCN2BYgAQzFPga66DYL7uFa') {
        throw new Error('Transaction does not use the correct Bitcom namespace')
      }

      // Transactions where the key from s3 did not sign an input are invalid
      if (!(action.in.some(input => input.e.a === action.out[0].s3))) {
        throw new Error('At least one input not signed with user ID key')
      }

      // h4 and h5 must both be 33 bytes (the two public keys)
      if (action.out[0].h4.length !== 66 || action.out[0].h5.length !== 66) {
        throw new Error('User public keys are of invalid length')
      }

      // s6 must be a timestamp
      if (!Number.isInteger(Number(action.out[0].s6))) {
        throw new Error('Timestamp must be a number')
      }

      // Timestamp must be within a sane range for a timestamp-in-seconds.
      // Timestamp must be greater than 1600000000
      if (Number(action.out[0].s6) < 1600000000) {
        throw new Error('Timestamp is too small')
      }

      // Timestamp must be less than 100000000000
      if (Number(action.out[0].s6) > 100000000000) {
        throw new Error('Timestamp is too large')
      }

      // s7 must be less than 64 characters
      if (action.out[0].s7.length > 64) {
        throw new Error('User\'s name longer than 64 characters')
      }

      // s8 must begin with https: or uhrp:
      if (
        !action.out[0].s8.startsWith('https:') &&
        !action.out[0].s8.startsWith('uhrp:')
      ) {
        throw new Error('Photo URL does not start with "https:" or "uhrp:"')
      }

      const data = {
        _id: action.tx.h,
        userID: action.out[0].s3,
        primarySigningPub: action.out[0].h4,
        privilegedSigningPub: action.out[0].h5,
        timestamp: Number(action.out[0].s6),
        name: action.out[0].s7,
        photoURL: action.out[0].s8
      }

      // The new profile record is created
      await state.create({
        collection: 'profiles',
        data
      })
      await createEvent(data)
    } catch (e) {
      console.error(`[!] ${action.tx.h}`)
      console.error(e)
    }
  },
  ejectPassenger: async (state, txid) => {
    try {
      console.log(`[-] ${txid}`)
      await state.delete({
        collection: 'profiles',
        find: { _id: txid }
      })
    } catch (e) {
      console.error(`[!] (rollback) ${txid}`)
      console.error(e)
    }
  },
  busRoute: {
    find: {
      'out.i': 0,
      'out.o0': 'OP_0',
      'out.o1': 'OP_RETURN',
      'out.s2': '1CUPPJ9Zjs2qCN2BYgAQzFPga66DYL7uFa'
    }
  }
}
