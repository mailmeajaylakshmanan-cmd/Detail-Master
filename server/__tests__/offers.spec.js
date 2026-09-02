describe('Offers & Packages: Redemption Logic & Limits', () => {
  function redeemOffer(assignedOffer) {
    if (assignedOffer.status !== 'active') {
      return { success: false, error: 'Offer is not active' };
    }

    if (assignedOffer.expires_at && new Date(assignedOffer.expires_at) < new Date()) {
      return { success: false, error: 'Offer has expired' };
    }

    // Atomic guard: completed_washes < total_washes
    if (assignedOffer.completed_washes >= assignedOffer.total_washes) {
      return { success: false, error: 'All washes on this offer have already been utilized' };
    }

    const updatedCompleted = assignedOffer.completed_washes + 1;
    const isNowFullyUtilized = updatedCompleted >= assignedOffer.total_washes;

    return {
      success: true,
      updatedOffer: {
        ...assignedOffer,
        completed_washes: updatedCompleted,
        status: isNowFullyUtilized ? 'completed' : 'active'
      }
    };
  }

  test('successfully redeems an available wash on an active offer', () => {
    const offer = {
      id: 1,
      total_washes: 5,
      completed_washes: 2,
      status: 'active',
      expires_at: '2027-12-31'
    };

    const result = redeemOffer(offer);
    expect(result.success).toBe(true);
    expect(result.updatedOffer.completed_washes).toBe(3);
    expect(result.updatedOffer.status).toBe('active');
  });

  test('transitions offer status to completed on final wash redemption', () => {
    const offer = {
      id: 2,
      total_washes: 3,
      completed_washes: 2,
      status: 'active',
      expires_at: '2027-12-31'
    };

    const result = redeemOffer(offer);
    expect(result.success).toBe(true);
    expect(result.updatedOffer.completed_washes).toBe(3);
    expect(result.updatedOffer.status).toBe('completed');
  });

  test('rejects redemption when completed_washes equals total_washes (double redemption prevention)', () => {
    const fullyUtilizedOffer = {
      id: 3,
      total_washes: 3,
      completed_washes: 3,
      status: 'completed',
      expires_at: '2027-12-31'
    };

    const result = redeemOffer(fullyUtilizedOffer);
    expect(result.success).toBe(false);
  });

  test('rejects redemption when offer is past expiration date', () => {
    const expiredOffer = {
      id: 4,
      total_washes: 5,
      completed_washes: 1,
      status: 'active',
      expires_at: '2020-01-01'
    };

    const result = redeemOffer(expiredOffer);
    expect(result.success).toBe(false);
    expect(result.error).toContain('expired');
  });
});
