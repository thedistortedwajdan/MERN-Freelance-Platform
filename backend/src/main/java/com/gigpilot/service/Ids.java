package com.gigpilot.service;

import com.gigpilot.exception.ApiException;
import org.bson.types.ObjectId;

final class Ids {
    private Ids() {}

    /** Rejects strings that are not valid Mongo ObjectIds with a 400 instead of a silent miss. */
    static String require(String id, String label) {
        if (id == null || !ObjectId.isValid(id)) {
            throw ApiException.badRequest("Invalid " + label + " ID");
        }
        return id;
    }
}
